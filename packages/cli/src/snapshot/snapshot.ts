import {  exec } from "child_process"
import { promisify } from "util"
import path from "path"
import fs from "fs/promises"
import { z } from "zod"
import { Global } from "../global"
import { projectRegistry } from "../lib/project-registry"

const execAsync = promisify(exec)

export namespace Snapshot {
    const log = {
        info: (msg: string, data?: any) => console.log(`[snapshot] ${msg}`, data || ''),
        warn: (msg: string, data?: any) => console.warn(`[snapshot] ${msg}`, data || ''),
        error: (msg: string, data?: any) => console.error(`[snapshot] ${msg}`, data || ''),
    }

    interface ExecResult {
        stdout: string
        stderr: string
        exitCode: number
    }

    async function runGit(command: string, options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}): Promise<ExecResult> {
        try {
            const { stdout, stderr } = await execAsync(command, {
                cwd: options.cwd,
                env: { ...process.env, ...options.env },
                encoding: 'utf-8',
                maxBuffer: 50 * 1024 * 1024,
            })
            return { stdout: stdout || '', stderr: stderr || '', exitCode: 0 }
        } catch (error: any) {
            return {
                stdout: error.stdout || '',
                stderr: error.stderr || '',
                exitCode: error.code || 1
            }
        }
    }

    export async function track(projectId: string): Promise<string | undefined> {
        const project = projectRegistry.getProject(projectId)
        if (!project) {
            log.warn("project not found", { projectId })
            return undefined
        }

        const worktree = project.cwd
        const git = gitdir(projectId)

        try {
            await fs.mkdir(git, { recursive: true })
            const gitExists = await fs.access(path.join(git, 'HEAD')).then(() => true).catch(() => false)
            if (!gitExists) {
                await runGit(`git init`, {
                    env: { GIT_DIR: git, GIT_WORK_TREE: worktree }
                })
                await runGit(`git --git-dir "${git}" config core.autocrlf false`)
                log.info("initialized", { projectId, git })
            }
        } catch (error) {
            log.warn("failed to initialize git", { error })
        }

        await runGit(`git --git-dir "${git}" --work-tree "${worktree}" add .`, { cwd: worktree })
        const result = await runGit(`git --git-dir "${git}" --work-tree "${worktree}" write-tree`, { cwd: worktree })

        const hash = result.stdout.trim()
        log.info("tracking", { hash, cwd: worktree, git })
        return hash
    }

    export const Patch = z.object({
        hash: z.string(),
        files: z.string().array(),
    })
    export type Patch = z.infer<typeof Patch>

    export async function patch(projectId: string, hash: string): Promise<Patch> {
        const project = projectRegistry.getProject(projectId)
        if (!project) {
            return { hash, files: [] }
        }

        const worktree = project.cwd
        const git = gitdir(projectId)

        await runGit(`git --git-dir "${git}" --work-tree "${worktree}" add .`, { cwd: worktree })
        const result = await runGit(
            `git -c core.autocrlf=false --git-dir "${git}" --work-tree "${worktree}" diff --no-ext-diff --name-only ${hash} -- .`,
            { cwd: worktree }
        )

        if (result.exitCode !== 0) {
            log.warn("failed to get diff", { hash, exitCode: result.exitCode })
            return { hash, files: [] }
        }

        const files = result.stdout
        return {
            hash,
            files: files
                .trim()
                .split("\n")
                .map((x) => x.trim())
                .filter(Boolean)
                .map((x) => path.join(worktree, x)),
        }
    }

    export async function restore(projectId: string, snapshot: string): Promise<boolean> {
        const project = projectRegistry.getProject(projectId)
        if (!project) {
            log.error("project not found", { projectId })
            return false
        }

        log.info("restore", { projectId, snapshot })
        const worktree = project.cwd
        const git = gitdir(projectId)

        const readResult = await runGit(
            `git --git-dir "${git}" --work-tree "${worktree}" read-tree ${snapshot}`,
            { cwd: worktree }
        )

        if (readResult.exitCode !== 0) {
            log.error("failed to read-tree", { snapshot, stderr: readResult.stderr })
            return false
        }

        const checkoutResult = await runGit(
            `git --git-dir "${git}" --work-tree "${worktree}" checkout-index -a -f`,
            { cwd: worktree }
        )

        if (checkoutResult.exitCode !== 0) {
            log.error("failed to checkout-index", { snapshot, stderr: checkoutResult.stderr })
            return false
        }

        await runGit(`git --git-dir "${git}" --work-tree "${worktree}" add .`, { cwd: worktree })
        const currentTree = await runGit(
            `git --git-dir "${git}" --work-tree "${worktree}" write-tree`,
            { cwd: worktree }
        )

        if (currentTree.exitCode === 0 && currentTree.stdout.trim()) {
            const diffResult = await runGit(
                `git --git-dir "${git}" diff-tree -r --name-only --diff-filter=A ${snapshot} ${currentTree.stdout.trim()}`,
                { cwd: worktree }
            )

            if (diffResult.exitCode === 0 && diffResult.stdout.trim()) {
                const newFiles = diffResult.stdout.trim().split("\n").filter(Boolean)
                for (const file of newFiles) {
                    const fullPath = path.join(worktree, file)
                    try {
                        await fs.unlink(fullPath)
                        log.info("deleted newly created file", { file: fullPath })
                    } catch {
                    }
                }
            }
        }

        return true
    }

    export async function revert(projectId: string, patches: Patch[]): Promise<boolean> {
        const project = projectRegistry.getProject(projectId)
        if (!project) {
            log.error("project not found", { projectId })
            return false
        }

        const worktree = project.cwd
        const git = gitdir(projectId)
        const files = new Set<string>()

        for (const item of patches) {
            for (const file of item.files) {
                if (files.has(file)) continue
                log.info("reverting", { file, hash: item.hash })

                const result = await runGit(
                    `git --git-dir "${git}" --work-tree "${worktree}" checkout ${item.hash} -- "${file}"`,
                    { cwd: worktree }
                )

                if (result.exitCode !== 0) {
                    const relativePath = path.relative(worktree, file)
                    const checkTree = await runGit(
                        `git --git-dir "${git}" --work-tree "${worktree}" ls-tree ${item.hash} -- "${relativePath}"`,
                        { cwd: worktree }
                    )

                    if (checkTree.exitCode === 0 && checkTree.stdout.trim()) {
                        log.info("file existed in snapshot but checkout failed, keeping", { file })
                    } else {
                        log.info("file did not exist in snapshot, deleting", { file })
                        await fs.unlink(file).catch(() => { })
                    }
                }
                files.add(file)
            }
        }

        return true
    }

    export async function diff(projectId: string, hash: string): Promise<string> {
        const project = projectRegistry.getProject(projectId)
        if (!project) {
            return ""
        }

        const worktree = project.cwd
        const git = gitdir(projectId)

        await runGit(`git --git-dir "${git}" --work-tree "${worktree}" add .`, { cwd: worktree })
        const result = await runGit(
            `git -c core.autocrlf=false --git-dir "${git}" --work-tree "${worktree}" diff --no-ext-diff ${hash} -- .`,
            { cwd: worktree }
        )

        if (result.exitCode !== 0) {
            log.warn("failed to get diff", { hash, exitCode: result.exitCode, stderr: result.stderr })
            return ""
        }

        return result.stdout.trim()
    }

    export const FileDiff = z.object({
        file: z.string(),
        before: z.string(),
        after: z.string(),
        additions: z.number(),
        deletions: z.number(),
    })
    export type FileDiff = z.infer<typeof FileDiff>

    export async function diffFull(projectId: string, from: string, to: string): Promise<FileDiff[]> {
        const project = projectRegistry.getProject(projectId)
        if (!project) {
            return []
        }

        const worktree = project.cwd
        const git = gitdir(projectId)
        const result: FileDiff[] = []

        const numstatResult = await runGit(
            `git -c core.autocrlf=false --git-dir "${git}" --work-tree "${worktree}" diff --no-ext-diff --no-renames --numstat ${from} ${to} -- .`,
            { cwd: worktree }
        )

        if (numstatResult.exitCode !== 0) {
            return []
        }

        const lines = numstatResult.stdout.trim().split("\n").filter(Boolean)

        for (const line of lines) {
            const [additions, deletions, file] = line.split("\t")
            const isBinaryFile = additions === "-" && deletions === "-"

            let before = ""
            let after = ""

            if (!isBinaryFile) {
                const beforeResult = await runGit(
                    `git -c core.autocrlf=false --git-dir "${git}" --work-tree "${worktree}" show ${from}:${file}`,
                    { cwd: worktree }
                )
                before = beforeResult.stdout

                const afterResult = await runGit(
                    `git -c core.autocrlf=false --git-dir "${git}" --work-tree "${worktree}" show ${to}:${file}`,
                    { cwd: worktree }
                )
                after = afterResult.stdout
            }

            result.push({
                file,
                before,
                after,
                additions: parseInt(additions) || 0,
                deletions: parseInt(deletions) || 0,
            })
        }

        return result
    }

    function gitdir(projectId: string): string {
        return path.join(Global.Path.data, "snapshot", projectId)
    }
}
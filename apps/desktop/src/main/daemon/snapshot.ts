import { exec } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import { homedir } from "node:os";
import { projectRegistry } from "./project-registry";

const execAsync = promisify(exec);

const DATA_DIR = path.join(homedir(), ".ama-desktop", "data");

interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

async function runGit(
  command: string,
  options: { cwd?: string; env?: NodeJS.ProcessEnv } = {},
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: options.cwd,
      env: { ...process.env, ...options.env },
      encoding: "utf-8",
      maxBuffer: 50 * 1024 * 1024,
    });
    return { stdout: stdout || "", stderr: stderr || "", exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || "",
      exitCode: error.code || 1,
    };
  }
}

function gitdir(projectId: string): string {
  return path.join(DATA_DIR, "snapshot", projectId);
}

export async function snapshotTrack(
  projectId: string,
): Promise<string | undefined> {
  const project = projectRegistry.getProject(projectId);
  if (!project) return undefined;

  const worktree = project.cwd;
  const git = gitdir(projectId);

  try {
    await fs.mkdir(git, { recursive: true });
    const gitExists = await fs
      .access(path.join(git, "HEAD"))
      .then(() => true)
      .catch(() => false);
    if (!gitExists) {
      await runGit("git init", {
        env: { GIT_DIR: git, GIT_WORK_TREE: worktree },
      });
      await runGit(`git --git-dir "${git}" config core.autocrlf false`);
    }
  } catch {
    // ignore init errors
  }

  await runGit(
    `git --git-dir "${git}" --work-tree "${worktree}" add .`,
    { cwd: worktree },
  );
  const result = await runGit(
    `git --git-dir "${git}" --work-tree "${worktree}" write-tree`,
    { cwd: worktree },
  );

  return result.stdout.trim() || undefined;
}

export async function snapshotPatch(
  projectId: string,
  hash: string,
): Promise<{ hash: string; files: string[] }> {
  const project = projectRegistry.getProject(projectId);
  if (!project) return { hash, files: [] };

  const worktree = project.cwd;
  const git = gitdir(projectId);

  await runGit(
    `git --git-dir "${git}" --work-tree "${worktree}" add .`,
    { cwd: worktree },
  );
  const result = await runGit(
    `git -c core.autocrlf=false --git-dir "${git}" --work-tree "${worktree}" diff --no-ext-diff --name-only ${hash} -- .`,
    { cwd: worktree },
  );

  if (result.exitCode !== 0) return { hash, files: [] };

  return {
    hash,
    files: result.stdout
      .trim()
      .split("\n")
      .map((x) => x.trim())
      .filter(Boolean)
      .map((x) => path.join(worktree, x)),
  };
}

export async function snapshotRestore(
  projectId: string,
  snapshot: string,
): Promise<boolean> {
  const project = projectRegistry.getProject(projectId);
  if (!project) return false;

  const worktree = project.cwd;
  const git = gitdir(projectId);

  const readResult = await runGit(
    `git --git-dir "${git}" --work-tree "${worktree}" read-tree ${snapshot}`,
    { cwd: worktree },
  );
  if (readResult.exitCode !== 0) return false;

  const checkoutResult = await runGit(
    `git --git-dir "${git}" --work-tree "${worktree}" checkout-index -a -f`,
    { cwd: worktree },
  );
  if (checkoutResult.exitCode !== 0) return false;

  // Clean up newly created files
  await runGit(
    `git --git-dir "${git}" --work-tree "${worktree}" add .`,
    { cwd: worktree },
  );
  const currentTree = await runGit(
    `git --git-dir "${git}" --work-tree "${worktree}" write-tree`,
    { cwd: worktree },
  );

  if (currentTree.exitCode === 0 && currentTree.stdout.trim()) {
    const diffResult = await runGit(
      `git --git-dir "${git}" diff-tree -r --name-only --diff-filter=A ${snapshot} ${currentTree.stdout.trim()}`,
      { cwd: worktree },
    );

    if (diffResult.exitCode === 0 && diffResult.stdout.trim()) {
      const newFiles = diffResult.stdout.trim().split("\n").filter(Boolean);
      for (const file of newFiles) {
        try {
          await fs.unlink(path.join(worktree, file));
        } catch {
          // ignore
        }
      }
    }
  }

  return true;
}

export async function snapshotDiff(
  projectId: string,
  hash: string,
): Promise<string> {
  const project = projectRegistry.getProject(projectId);
  if (!project) return "";

  const worktree = project.cwd;
  const git = gitdir(projectId);

  await runGit(
    `git --git-dir "${git}" --work-tree "${worktree}" add .`,
    { cwd: worktree },
  );
  const result = await runGit(
    `git -c core.autocrlf=false --git-dir "${git}" --work-tree "${worktree}" diff --no-ext-diff ${hash} -- .`,
    { cwd: worktree },
  );

  return result.exitCode === 0 ? result.stdout.trim() : "";
}

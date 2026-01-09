import { spawn } from "child_process"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import pc from "picocolors"
import { AMA_DIR, CODE_DIR, STORAGE_DIR } from "../constant"
const execAsync = promisify(exec)



export const CODE_SERVER_VERSION = "4.96.4"

function getPlatformInfo(): { platform: string; arch: string; ext: string } {
    const platform = process.platform
    const arch = process.arch

    if (platform === 'darwin') {
        return {
            platform: 'macos',
            arch: arch === 'arm64' ? 'arm64' : 'amd64',
            ext: 'tar.gz'
        }
    } else if (platform === 'linux') {
        return {
            platform: 'linux',
            arch: arch === 'arm64' ? 'arm64' : 'amd64',
            ext: 'tar.gz'
        }
    } else {
        throw new Error(`Unsupported platform: ${platform}`)
    }
}

function getDownloadUrl(): string {
    const { platform, arch, ext } = getPlatformInfo()
    return `https://github.com/coder/code-server/releases/download/v${CODE_SERVER_VERSION}/code-server-${CODE_SERVER_VERSION}-${platform}-${arch}.${ext}`
}

function getCodeServerDir(): string {
    const { platform, arch } = getPlatformInfo()
    return path.join(CODE_DIR, `code-server-${CODE_SERVER_VERSION}-${platform}-${arch}`)
}

function getCodeServerBin(): string {
    return path.join(getCodeServerDir(), 'bin', 'code-server')
}

export function isCodeServerInstalled(): boolean {
    const binPath = getCodeServerBin()
    return fs.existsSync(binPath)
}

export async function installCodeServer(): Promise<void> {
    const { ext } = getPlatformInfo()
    const downloadUrl = getDownloadUrl()
    const tarballPath = path.join(AMA_DIR, `code-server.${ext}`)

    if (!fs.existsSync(AMA_DIR)) {
        fs.mkdirSync(AMA_DIR, { recursive: true })
    }
    if (!fs.existsSync(CODE_DIR)) {
        fs.mkdirSync(CODE_DIR, { recursive: true })
    }
    if (!fs.existsSync(STORAGE_DIR)) {
        fs.mkdirSync(STORAGE_DIR, { recursive: true })
    }

    console.log(pc.cyan(`downloading code-server v${CODE_SERVER_VERSION}...`))
    console.log(pc.gray(downloadUrl))

    const response = await fetch(downloadUrl)
    if (!response.ok) {
        throw new Error(`Failed to download code-server: ${response.statusText}`)
    }

    const buffer = await response.arrayBuffer()
    await fs.promises.writeFile(tarballPath, Buffer.from(buffer))

    console.log(pc.cyan('Extracting code-server...'))

    await execAsync(`tar -xzf ${tarballPath} -C ${CODE_DIR}`)

    await fs.promises.unlink(tarballPath)

    const binPath = getCodeServerBin()
    if (fs.existsSync(binPath)) {
        await fs.promises.chmod(binPath, 0o755)
    }

    console.log(pc.green('code-server installed successfully'))
}

async function killExistingCodeServer(): Promise<void> {
    try {
        if (process.platform === 'win32') {
            await execAsync('netstat -ano | findstr :8081 | findstr LISTENING').then(async ({ stdout }) => {
                const pid = stdout.trim().split(/\s+/).pop()
                if (pid) await execAsync(`taskkill /PID ${pid} /F`)
            }).catch(() => { })
        } else {
            await execAsync('lsof -ti:8081').then(async ({ stdout }) => {
                const pid = stdout.trim()
                if (pid) await execAsync(`kill -9 ${pid}`)
            }).catch(() => { })
        }
    } catch {
    }
}

/**
 * Setup default VS Code settings including theme
 * IMPORTANT: Must be called BEFORE installExtensions() to disable signature verification
 */
async function setupDefaultSettings(): Promise<void> {
    const userDir = path.join(STORAGE_DIR, 'User')
    const settingsPath = path.join(userDir, 'settings.json')

    // Ensure User directory exists
    if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true })
    }

    // Default settings with the theme (castrogusttavo.min-theme uses "Min Dark" and "Min Light")
    const defaultSettings: Record<string, unknown> = {
        // Disable signature verification for Open VSX extensions
        "extensions.verifySignature": false,
        // Theme settings
        "workbench.colorTheme": "Min Dark",
        "workbench.startupEditor": "none",
        // Editor settings
        "editor.fontSize": 14,
        "editor.fontFamily": "'JetBrains Mono', 'Fira Code', Menlo, Monaco, 'Courier New', monospace",
        "editor.minimap.enabled": false,
        "editor.wordWrap": "on",
        // UI settings
        "window.menuBarVisibility": "compact",
        "workbench.activityBar.location": "top",
    }

    // Merge with existing settings if they exist
    let existingSettings: Record<string, unknown> = {}
    if (fs.existsSync(settingsPath)) {
        try {
            const content = await fs.promises.readFile(settingsPath, 'utf-8')
            existingSettings = JSON.parse(content)
        } catch {
            // If parsing fails, use empty object
        }
    }

    const mergedSettings = { ...defaultSettings, ...existingSettings }
    // Ensure critical settings are always set correctly
    mergedSettings["workbench.colorTheme"] = "Min Dark"
    mergedSettings["extensions.verifySignature"] = false

    await fs.promises.writeFile(settingsPath, JSON.stringify(mergedSettings, null, 2))
    console.log(pc.green('ama code-server settings configured'))
}

/**
 * Install extensions using code-server CLI before starting the server
 * NOTE: setupDefaultSettings() must be called first to disable signature verification
 */
async function installExtensions(): Promise<void> {
    const binPath = getCodeServerBin()
    const extensions = [
        "castrogusttavo.min-theme",  
    ]

    for (const ext of extensions) {
        try {
            console.log(pc.cyan(`ama installing extension: ${ext}...`))
            await execAsync(`"${binPath}" --user-data-dir "${STORAGE_DIR}" --install-extension ${ext}`)
            console.log(pc.green(`ama extension ${ext} installed`))
        } catch (error) {
            console.log(pc.yellow(`ama failed to install extension ${ext}`), error)
        }
    }
}

export async function startCodeServer(cwd?: string): Promise<ReturnType<typeof spawn>> {
    const binPath = getCodeServerBin()
    const workDir = cwd || process.cwd()

    if (!fs.existsSync(binPath)) {
        throw new Error('ama code-server is not installed. Run installCodeServer() first.')
    }

    await killExistingCodeServer()

    // Setup settings FIRST to disable signature verification, then install extensions
    await setupDefaultSettings()
    await installExtensions()

    const workspaceStoragePath = path.join(STORAGE_DIR, 'User', 'workspaceStorage')
    try {
        // Remove workspace storage to clear "last opened folder" memory
        if (fs.existsSync(workspaceStoragePath)) {
            await fs.promises.rm(workspaceStoragePath, { recursive: true, force: true })
        }
        // Also remove the state.vscdb if it exists (stores recent workspaces)
        const stateDbPath = path.join(STORAGE_DIR, 'User', 'globalStorage', 'state.vscdb')
        if (fs.existsSync(stateDbPath)) {
            await fs.promises.unlink(stateDbPath)
        }
    } catch {
        // Ignore errors during cleanup
    }

    console.log(pc.cyan(`ama starting code-server`))

    const codeServer = spawn(
        binPath,
        [
            "--port", "8081",
            "--host", "0.0.0.0",
            "--auth", "none",
            "--user-data-dir", STORAGE_DIR,
            "--disable-workspace-trust",
            workDir,
        ],
        {
            stdio: ["ignore", "pipe", "pipe"],
        }
    )

    console.log(pc.green(`ama code-server running at http://localhost:8081/?folder=${encodeURIComponent(workDir)}`))

    return codeServer
}

export { isCodeServerInstalled as isInstalled }
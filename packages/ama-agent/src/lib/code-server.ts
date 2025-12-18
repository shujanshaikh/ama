import { spawn } from "child_process"
import { exec } from "child_process"
import { promisify } from "util"
import fs from "fs"
import path from "path"
import os from "os"
import pc from "picocolors"

const execAsync = promisify(exec)

const AMA_DIR = path.join(os.homedir(), '.ama')
const CODE_DIR = path.join(AMA_DIR, 'code')
const STORAGE_DIR = path.join(AMA_DIR, 'storage')

const CODE_SERVER_VERSION = "4.96.4"

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

    console.log(pc.cyan(`Downloading code-server v${CODE_SERVER_VERSION}...`))
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

    console.log(pc.green('✓ code-server installed successfully'))
}

export async function startCodeServer(cwd?: string): Promise<ReturnType<typeof spawn>> {
    const binPath = getCodeServerBin()
    const workDir = cwd || process.cwd()

    if (!fs.existsSync(binPath)) {
        throw new Error('code-server is not installed. Run installCodeServer() first.')
    }

    console.log(pc.cyan('Starting code-server...'))

    const codeServer = spawn(
        binPath,
        [
            "--port", "8081",
            "--host", "0.0.0.0",
            "--auth", "none", 
            "--user-data-dir", STORAGE_DIR,
            workDir,
        ],
        {
            stdio: ["ignore", "pipe", "pipe"],
        }
    )

    console.log(pc.green(`✓ code-server running at http://localhost:8081`))

    return codeServer
}

export { isCodeServerInstalled as isInstalled }
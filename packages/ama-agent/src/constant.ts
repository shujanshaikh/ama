import path from "path"
import os from "os"

export const DEFAULT_SERVER_URL = "ws://localhost:3000";
export const AMA_DIR = path.join(os.homedir(), '.ama')
export const CODE_DIR = path.join(AMA_DIR, 'code')
export const STORAGE_DIR = path.join(AMA_DIR, 'storage')
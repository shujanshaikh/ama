import path from "path"
import os from "os"

export const DEFAULT_SERVER_URL = process.env.SERVER_URL || "ws://localhost:8787";
export const CLIENT_ID = "client_01K4Y8A5Q3FYGXD362BJQ6AGYD"
export const AMA_DIR = path.join(os.homedir(), '.amai')
export const CODE_DIR = path.join(AMA_DIR, 'code')
export const STORAGE_DIR = path.join(AMA_DIR, 'storage')

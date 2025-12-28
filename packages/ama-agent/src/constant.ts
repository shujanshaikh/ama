import path from "path"
import os from "os"

export const DEFAULT_SERVER_URL = "wss://ama-production-a628.up.railway.app";
export const CLIENT_ID = "client_01K4Y8A67H544Z6J8A47E5GJ9A"
export const AMA_DIR = path.join(os.homedir(), '.amai')
export const CODE_DIR = path.join(AMA_DIR, 'code')
export const STORAGE_DIR = path.join(AMA_DIR, 'storage')

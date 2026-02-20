import { readdirSync } from "node:fs";
import path from "node:path";

const ignoreFiles = ["node_modules", ".git", ".next", ".env", ".env.local", ".env.development.local", ".env.test.local", ".env.production.local" , ".output" , ".turbo" , ".vercel" , ".next" , ".tanstack" , ".nitro" , ".wrangler" , ".alchemy" , ".coverage" , ".nyc_output" , ".cache" , "tmp" , "temp" , ".idea" , ".vscode" , ".zig-cache" , "zig-out" , ".coverage" , "coverage" , "logs" , ".venv" , "venv" , "env" , ".next" , ".turbo" , ".vercel" , ".output" , ".tanstack" , ".nitro" , ".wrangler" , ".alchemy" , ".coverage" , ".nyc_output" , ".cache" , "tmp" , "temp" , ".idea" , ".vscode" , ".zig-cache" , "zig-out" , ".coverage" , "coverage" , "logs" , ".venv" , "venv" , "env"];

export const getContext = (dir: string, base = dir, allFiles: string[] = []) => {
    const filePath = readdirSync(dir, { withFileTypes: true });
    for (const file of filePath) {
        if (ignoreFiles.includes(file.name)) continue;
        const fullPath = path.join(dir, file.name);
        if (file.isDirectory()) {
            getContext(fullPath, base, allFiles);
        } else {
            allFiles.push(path.relative(base, fullPath));
        }
    }
    return allFiles;
}
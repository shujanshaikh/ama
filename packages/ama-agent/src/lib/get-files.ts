import { readdirSync } from "node:fs";
import path from "node:path";

const ignoreFiles = ["node_modules", ".git", ".next", ".env", ".env.local", ".env.development.local", ".env.test.local", ".env.production.local"];

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
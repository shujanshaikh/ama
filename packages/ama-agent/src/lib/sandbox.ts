import path from "path";
import { isPathWithinProject } from "./project-registry";

export function validatePath(filePath: string, projectCwd: string): {
    valid: boolean;
    error?: string;
    resolvedPath?: string;
} {
    if (!projectCwd) {
        return {
            valid: false,
            error: 'ACCESS_DENIED: No project context provided',
        };
    }

    try {
        const resolvedPath = path.resolve(projectCwd, filePath);
        
        if (!isPathWithinProject(filePath, projectCwd)) {
            return {
                valid: false,
                error: `ACCESS_DENIED: Path "${filePath}" is outside project directory "${projectCwd}"`,
            };
        }

        return {
            valid: true,
            resolvedPath,
        };
    } catch (error) {
        return {
            valid: false,
            error: `ACCESS_DENIED: Invalid path "${filePath}"`,
        };
    }
}


export function resolveProjectPath(filePath: string, projectCwd: string): string {
    return path.resolve(projectCwd, filePath);
}


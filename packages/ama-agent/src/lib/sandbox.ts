import path from "path";
import fs from "node:fs";

// Filesystem-mutating tools must have projectCwd — fail closed otherwise
const MUTATING_TOOLS = new Set([
    "editFile",
    "deleteFile",
    "stringReplace",
    "runTerminalCommand",
]);

export function isMutatingTool(toolName: string): boolean {
    return MUTATING_TOOLS.has(toolName);
}

/**
 * Robust boundary check using path.relative instead of startsWith.
 * Resolves symlinks for both root and target to prevent escapes.
 */
export function isPathWithinProject(filePath: string, projectCwd: string): boolean {
    try {
        const resolvedCwd = safeRealpath(projectCwd);
        const resolved = path.resolve(resolvedCwd, filePath);
        const resolvedTarget = safeRealpath(resolved);

        const rel = path.relative(resolvedCwd, resolvedTarget);
        // If relative path starts with ".." or is absolute, it's outside
        if (rel.startsWith("..") || path.isAbsolute(rel)) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

/**
 * Resolve real path, following symlinks. Falls back to path.resolve if
 * the target doesn't exist yet (e.g. for new file creation — we still
 * check the parent directory).
 */
function safeRealpath(p: string): string {
    try {
        return fs.realpathSync(p);
    } catch {
        // If the exact path doesn't exist, resolve the parent
        const parent = path.dirname(p);
        try {
            const realParent = fs.realpathSync(parent);
            return path.join(realParent, path.basename(p));
        } catch {
            return path.resolve(p);
        }
    }
}

export function validatePath(
    filePath: string,
    projectCwd: string,
): {
    valid: boolean;
    error?: string;
    resolvedPath?: string;
} {
    if (!projectCwd) {
        return {
            valid: false,
            error: "ACCESS_DENIED: No project context provided",
        };
    }

    try {
        if (!isPathWithinProject(filePath, projectCwd)) {
            return {
                valid: false,
                error: `ACCESS_DENIED: Path "${filePath}" is outside project directory "${projectCwd}"`,
            };
        }

        const resolvedCwd = safeRealpath(projectCwd);
        const resolvedPath = path.resolve(resolvedCwd, filePath);

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

/**
 * Require projectCwd for mutating tools. Returns an error response if missing.
 */
export function requireProjectCwd(
    toolName: string,
    projectCwd: string | undefined,
): { allowed: true } | { allowed: false; error: string } {
    if (!projectCwd && isMutatingTool(toolName)) {
        return {
            allowed: false,
            error: `ACCESS_DENIED: Tool "${toolName}" requires a project context (projectCwd) but none was provided`,
        };
    }
    return { allowed: true };
}

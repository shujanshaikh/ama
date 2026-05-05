import path from "path";
import fs from "node:fs";

const MUTATING_TOOLS = new Set(["edit", "write", "bash"]);

export function isMutatingTool(toolName: string): boolean {
  return MUTATING_TOOLS.has(toolName);
}

export function isPathWithinProject(filePath: string, projectCwd: string): boolean {
  try {
    const resolvedCwd = safeRealpath(projectCwd);
    const resolved = path.resolve(resolvedCwd, filePath);
    const resolvedTarget = safeRealpath(resolved);
    const rel = path.relative(resolvedCwd, resolvedTarget);
    if (rel.startsWith("..") || path.isAbsolute(rel)) return false;
    return true;
  } catch {
    return false;
  }
}

function safeRealpath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    const parent = path.dirname(p);
    try {
      const realParent = fs.realpathSync(parent);
      return path.join(realParent, path.basename(p));
    } catch {
      return path.resolve(p);
    }
  }
}

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

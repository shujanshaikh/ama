import path from "node:path";

export function validatePath(
  filePath: string,
  projectCwd: string,
): { valid: boolean; error?: string; resolvedPath?: string } {
  if (!projectCwd) {
    return { valid: false, error: "ACCESS_DENIED: No project context provided" };
  }

  try {
    const resolvedPath = path.resolve(projectCwd, filePath);
    const normalized = path.normalize(resolvedPath);
    const normalizedCwd = path.normalize(projectCwd);

    if (!normalized.startsWith(normalizedCwd)) {
      return {
        valid: false,
        error: `ACCESS_DENIED: Path "${filePath}" is outside project directory "${projectCwd}"`,
      };
    }

    return { valid: true, resolvedPath };
  } catch {
    return { valid: false, error: `ACCESS_DENIED: Invalid path "${filePath}"` };
  }
}

export function resolveProjectPath(
  filePath: string,
  projectCwd: string,
): string {
  return path.resolve(projectCwd, filePath);
}

export function isPathWithinProject(
  filePath: string,
  projectCwd: string,
): boolean {
  try {
    const resolved = path.resolve(projectCwd, filePath);
    const normalized = path.normalize(resolved);
    const normalizedCwd = path.normalize(projectCwd);
    return normalized.startsWith(normalizedCwd);
  } catch {
    return false;
  }
}

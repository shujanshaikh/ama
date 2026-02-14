import path from "node:path";

function normalizeForComparison(inputPath: string): string {
  const normalized = path.normalize(inputPath);
  return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function isWithinProjectPath(resolvedPath: string, projectCwd: string): boolean {
  const normalized = normalizeForComparison(resolvedPath);
  const normalizedCwd = normalizeForComparison(projectCwd);
  const relative = path.relative(normalizedCwd, normalized);

  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function validatePath(
  filePath: string,
  projectCwd: string,
): { valid: boolean; error?: string; resolvedPath?: string } {
  if (!projectCwd) {
    return { valid: false, error: "ACCESS_DENIED: No project context provided" };
  }

  try {
    const resolvedPath = path.resolve(projectCwd, filePath);
    if (!isWithinProjectPath(resolvedPath, projectCwd)) {
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
    return isWithinProjectPath(resolved, projectCwd);
  } catch {
    return false;
  }
}

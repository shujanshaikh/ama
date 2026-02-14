import { dialog } from "electron";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

export interface DiscoveredProject {
  name: string;
  path: string;
  ide: "vscode" | "cursor" | "webstorm" | "zed" | "unknown";
}

function tryParseJSON(filePath: string): any {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function getVSCodeStoragePath(appName: string): string {
  switch (process.platform) {
    case "win32":
      return join(
        homedir(),
        "AppData",
        "Roaming",
        appName,
        "User",
        "globalStorage",
        "storage.json",
      );
    case "linux":
      return join(
        homedir(),
        ".config",
        appName,
        "User",
        "globalStorage",
        "storage.json",
      );
    default:
      return join(
        homedir(),
        "Library",
        "Application Support",
        appName,
        "User",
        "globalStorage",
        "storage.json",
      );
  }
}

function getJetBrainsConfigDir(): string {
  switch (process.platform) {
    case "win32":
      return join(homedir(), "AppData", "Roaming", "JetBrains");
    case "linux":
      return join(homedir(), ".config", "JetBrains");
    default:
      return join(homedir(), "Library", "Application Support", "JetBrains");
  }
}

function resolveFsPath(value: string): string | null {
  if (!value) return null;
  try {
    if (value.startsWith("file:")) {
      return fileURLToPath(value);
    }
    const parsed = new URL(value);
    if (parsed.protocol === "file:") {
      return fileURLToPath(parsed);
    }
  } catch {
    // Not a URL, treat as plain filesystem path below.
  }
  return value;
}

function scanVSCodeLike(ide: "vscode" | "cursor"): DiscoveredProject[] {
  const appName = ide === "vscode" ? "Code" : "Cursor";
  const storagePath = getVSCodeStoragePath(appName);

  const data = tryParseJSON(storagePath);
  if (!data) return [];

  const entries = data?.openedPathsList?.entries ?? data?.openedPathsList?.workspaces3 ?? [];
  const projects: DiscoveredProject[] = [];

  for (const entry of entries) {
    const uri = typeof entry === "string" ? entry : entry?.folderUri ?? entry?.configPath;
    if (!uri) continue;

    const fsPath = resolveFsPath(uri);
    if (!fsPath || !existsSync(fsPath)) continue;
    projects.push({ name: basename(fsPath), path: fsPath, ide });
  }

  return projects;
}

function scanWebStorm(): DiscoveredProject[] {
  const jetbrainsDir = getJetBrainsConfigDir();
  const projects: DiscoveredProject[] = [];

  try {
    const dirs = readdirSync(jetbrainsDir).filter((d) => d.startsWith("WebStorm"));
    for (const dir of dirs) {
      const recentPath = join(jetbrainsDir, dir, "options", "recentProjects.xml");
      try {
        const content = readFileSync(recentPath, "utf-8");
        const matches = content.matchAll(
          /key="(\$USER_HOME\$[^"]*|\/[^"]*|[A-Za-z]:(?:\\|\/)[^"]*)"/g,
        );
        for (const match of matches) {
          let fsPath = match[1].replace("$USER_HOME$", homedir());
          if (process.platform === "win32") {
            fsPath = fsPath.replace(/\\\\/g, "\\");
          }
          fsPath = resolveFsPath(fsPath) ?? fsPath;
          if (existsSync(fsPath)) {
            projects.push({ name: basename(fsPath), path: fsPath, ide: "webstorm" });
          }
        }
      } catch {
        // skip
      }
    }
  } catch {
    // JetBrains dir doesn't exist
  }

  return projects;
}

export async function discoverProjects(): Promise<DiscoveredProject[]> {
  const all = [
    ...scanVSCodeLike("vscode"),
    ...scanVSCodeLike("cursor"),
    ...scanWebStorm(),
  ];

  // Deduplicate by path
  const seen = new Set<string>();
  return all.filter((p) => {
    if (seen.has(p.path)) return false;
    seen.add(p.path);
    return true;
  });
}

export async function selectFolder(): Promise<string | null> {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select Project Folder",
  });
  return result.canceled ? null : result.filePaths[0] ?? null;
}

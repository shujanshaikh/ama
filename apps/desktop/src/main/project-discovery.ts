import { dialog } from "electron";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";

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

function scanVSCodeLike(ide: "vscode" | "cursor"): DiscoveredProject[] {
  const appName = ide === "vscode" ? "Code" : "Cursor";
  const storagePath = join(
    homedir(),
    "Library",
    "Application Support",
    appName,
    "User",
    "globalStorage",
    "storage.json",
  );

  const data = tryParseJSON(storagePath);
  if (!data) return [];

  const entries = data?.openedPathsList?.entries ?? data?.openedPathsList?.workspaces3 ?? [];
  const projects: DiscoveredProject[] = [];

  for (const entry of entries) {
    const uri = typeof entry === "string" ? entry : entry?.folderUri ?? entry?.configPath;
    if (!uri) continue;

    try {
      const parsed = new URL(uri);
      if (parsed.protocol !== "file:") continue;
      const fsPath = decodeURIComponent(parsed.pathname);
      if (existsSync(fsPath)) {
        projects.push({ name: basename(fsPath), path: fsPath, ide });
      }
    } catch {
      // skip invalid URIs
    }
  }

  return projects;
}

function scanWebStorm(): DiscoveredProject[] {
  const jetbrainsDir = join(homedir(), "Library", "Application Support", "JetBrains");
  const projects: DiscoveredProject[] = [];

  try {
    const dirs = readdirSync(jetbrainsDir).filter((d) => d.startsWith("WebStorm"));
    for (const dir of dirs) {
      const recentPath = join(jetbrainsDir, dir, "options", "recentProjects.xml");
      try {
        const content = readFileSync(recentPath, "utf-8");
        const matches = content.matchAll(/key="(\$USER_HOME\$[^"]*|\/[^"]*)"/g);
        for (const match of matches) {
          let fsPath = match[1].replace("$USER_HOME$", homedir());
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

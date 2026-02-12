import { contextBridge } from "electron";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

function getCliUserId(): string | null {
  try {
    const credPath = join(homedir(), ".amai", "credentials.json");
    const data = JSON.parse(readFileSync(credPath, "utf-8"));
    return data?.user?.id ?? null;
  } catch {
    return null;
  }
}

contextBridge.exposeInMainWorld("amaDesktop", {
  isDesktop: true,
  platform: process.platform,
  userId: getCliUserId(),
});

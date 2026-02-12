import { projectRegistry } from "./project-registry";
import { getContext } from "./get-files";
import {
  snapshotTrack,
  snapshotPatch,
  snapshotRestore,
  snapshotDiff,
} from "./snapshot";

export const rpcHandlers: Record<string, (input: any) => Promise<any>> = {
  "daemon:get_workspace_folders": async () => {
    const projects = projectRegistry.list();
    return {
      folders: projects.map((p) => ({
        id: p.id,
        cwd: p.cwd,
        name: p.name,
        active: p.active,
      })),
    };
  },

  "daemon:get_context": async ({ cwd }: { cwd: string }) => {
    const files = getContext(cwd);
    return { files, cwd };
  },

  "daemon:register_project": async ({
    projectId,
    cwd,
    name,
  }: {
    projectId: string;
    cwd: string;
    name?: string;
  }) => {
    projectRegistry.register(projectId, cwd, name);
    return { success: true, projectId, cwd };
  },

  "daemon:unregister_project": async ({
    projectId,
  }: {
    projectId: string;
  }) => {
    projectRegistry.unregister(projectId);
    return { success: true, projectId };
  },

  "daemon:get_project": async ({ projectId }: { projectId: string }) => {
    const project = projectRegistry.getProject(projectId);
    if (!project) throw new Error(`Project not found: ${projectId}`);
    return { project };
  },

  "daemon:list_projects": async () => {
    return { projects: projectRegistry.list() };
  },

  "daemon:status": async () => {
    return {
      connected: true,
      timestamp: Date.now(),
      platform: process.platform,
      arch: process.arch,
    };
  },

  "daemon:snapshot_track": async ({
    projectId,
  }: {
    projectId: string;
  }) => {
    const hash = await snapshotTrack(projectId);
    return { success: true, hash };
  },

  "daemon:snapshot_patch": async ({
    projectId,
    hash,
  }: {
    projectId: string;
    hash: string;
  }) => {
    const patch = await snapshotPatch(projectId, hash);
    return { success: true, patch };
  },

  "daemon:snapshot_restore": async ({
    projectId,
    snapshot,
  }: {
    projectId: string;
    snapshot: string;
  }) => {
    const success = await snapshotRestore(projectId, snapshot);
    return { success };
  },

  "daemon:snapshot_diff": async ({
    projectId,
    hash,
  }: {
    projectId: string;
    hash: string;
  }) => {
    const diff = await snapshotDiff(projectId, hash);
    return { success: true, diff };
  },
};

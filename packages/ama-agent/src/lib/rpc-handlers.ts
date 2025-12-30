import { projectRegistry } from './project-registry';
import { getContext } from './get-files';
import { scanIdeProjects } from './ide-projects';
import { Snapshot } from '../snapshot/snapshot';

export interface RpcError {
    _tag: string;
    message: string;
}

export const rpcHandlers: Record<string, (input: any) => Promise<any>> = {
    'daemon:get_workspace_folders': async () => {
        const projects = projectRegistry.list();
        return {
            folders: projects.map(p => ({
                id: p.id,
                cwd: p.cwd,
                name: p.name,
                active: p.active,
            })),
        };
    },

    'daemon:get_environment': async ({ gitRepositoryUrl }: { gitRepositoryUrl: string }) => {
        const projects = projectRegistry.list();
        // For now, we don't have gitUrl stored, so we match by checking if the project exists
        // This can be extended to match by git remote URL

        if (projects.length === 0) {
            const error: RpcError = {
                _tag: 'ProjectUnlinkedError',
                message: `Getting a local project by git repository URL "${gitRepositoryUrl}" returned an unlinked project. Please link it by running \`amai link <project name> <path to project directory>\``,
            };
            throw error;
        }

        // Return first matching project for now
        // TODO: Match by git repository URL
        return {
            project: projects[0],
            env: {
                platform: process.platform,
                arch: process.arch,
                nodeVersion: process.version,
            },
        };
    },

    'daemon:get_context': async ({ cwd }: { cwd: string }) => {
        try {
            const files = getContext(cwd);
            return { files, cwd };
        } catch (error: any) {
            const rpcError: RpcError = {
                _tag: 'ContextError',
                message: error.message || 'Failed to get context',
            };
            throw rpcError;
        }
    },

    'daemon:get_ide_projects': async () => {
        const projects = await scanIdeProjects();
        return { projects };
    },

    'daemon:register_project': async ({ projectId, cwd, name }: { projectId: string; cwd: string; name?: string }) => {
        if (!projectId || !cwd) {
            const error: RpcError = {
                _tag: 'ValidationError',
                message: 'projectId and cwd are required',
            };
            throw error;
        }
        projectRegistry.register(projectId, cwd, name);
        return { success: true, projectId, cwd };
    },

    'daemon:unregister_project': async ({ projectId }: { projectId: string }) => {
        if (!projectId) {
            const error: RpcError = {
                _tag: 'ValidationError',
                message: 'projectId is required',
            };
            throw error;
        }
        projectRegistry.unregister(projectId);
        return { success: true, projectId };
    },

    'daemon:get_project': async ({ projectId }: { projectId: string }) => {
        const project = projectRegistry.getProject(projectId);
        if (!project) {
            const error: RpcError = {
                _tag: 'ProjectNotFoundError',
                message: `Project not found: ${projectId}`,
            };
            throw error;
        }
        return { project };
    },

    'daemon:list_projects': async () => {
        const projects = projectRegistry.list();
        return { projects };
    },

    'daemon:status': async () => {
        return {
            connected: true,
            timestamp: Date.now(),
            platform: process.platform,
            arch: process.arch,
        };
    },

    // Snapshot handlers for undo functionality
    'daemon:snapshot_track': async ({ projectId }: { projectId: string }) => {
        if (!projectId) {
            const error: RpcError = {
                _tag: 'ValidationError',
                message: 'projectId is required',
            };
            throw error;
        }
        const hash = await Snapshot.track(projectId);
        return { success: true, hash };
    },

    'daemon:snapshot_patch': async ({ projectId, hash }: { projectId: string; hash: string }) => {
        if (!projectId || !hash) {
            const error: RpcError = {
                _tag: 'ValidationError',
                message: 'projectId and hash are required',
            };
            throw error;
        }
        const patch = await Snapshot.patch(projectId, hash);
        return { success: true, patch };
    },

    'daemon:snapshot_revert': async ({ projectId, patches }: { projectId: string; patches: Snapshot.Patch[] }) => {
        if (!projectId || !patches) {
            const error: RpcError = {
                _tag: 'ValidationError',
                message: 'projectId and patches are required',
            };
            throw error;
        }
        const success = await Snapshot.revert(projectId, patches);
        return { success };
    },

    'daemon:snapshot_restore': async ({ projectId, snapshot }: { projectId: string; snapshot: string }) => {
        if (!projectId || !snapshot) {
            const error: RpcError = {
                _tag: 'ValidationError',
                message: 'projectId and snapshot are required',
            };
            throw error;
        }
        const success = await Snapshot.restore(projectId, snapshot);
        return { success };
    },

    'daemon:snapshot_diff': async ({ projectId, hash }: { projectId: string; hash: string }) => {
        if (!projectId || !hash) {
            const error: RpcError = {
                _tag: 'ValidationError',
                message: 'projectId and hash are required',
            };
            throw error;
        }
        const diff = await Snapshot.diff(projectId, hash);
        return { success: true, diff };
    },
};


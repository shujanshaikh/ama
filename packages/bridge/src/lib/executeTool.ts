import { dispatchToAgent } from "@/lib/do-session";
import type { WorkerBindings } from "@/env";

export type ToolExecutionContext = {
  env: WorkerBindings;
  userId: string;
  projectId?: string;
  projectCwd?: string;
};

export const executeTool = async (
  context: ToolExecutionContext,
  toolName: string,
  inputParameters: object,
): Promise<unknown> => {
  const callId = crypto.randomUUID();

  return dispatchToAgent(
    context.env,
    context.userId,
    {
      type: "tool_call",
      id: callId,
      tool: toolName,
      args: inputParameters,
      projectId: context.projectId,
      projectCwd: context.projectCwd,
    },
    60000,
  );
};

export const createSnapshot = async (
  env: WorkerBindings,
  userId: string,
  projectId: string,
): Promise<string | null> => {
  const callId = crypto.randomUUID();

  try {
    const result = (await dispatchToAgent(
      env,
      userId,
      {
        type: "rpc_call",
        id: callId,
        method: "daemon:snapshot_track",
        args: { projectId },
      },
      10000,
    )) as { hash?: string };

    return result?.hash || null;
  } catch {
    return null;
  }
};

export const registerProject = async (
  env: WorkerBindings,
  userId: string,
  projectId: string,
  cwd: string,
  name?: string,
): Promise<boolean> => {
  const callId = crypto.randomUUID();

  try {
    const result = (await dispatchToAgent(
      env,
      userId,
      {
        type: "rpc_call",
        id: callId,
        method: "daemon:register_project",
        args: { projectId, cwd, name },
      },
      10000,
    )) as { success?: boolean };

    return result?.success === true;
  } catch {
    return false;
  }
};

export const restoreSnapshot = async (
  env: WorkerBindings,
  userId: string,
  projectId: string,
  snapshotHash: string,
): Promise<boolean> => {
  const callId = crypto.randomUUID();

  try {
    const result = (await dispatchToAgent(
      env,
      userId,
      {
        type: "rpc_call",
        id: callId,
        method: "daemon:snapshot_restore",
        args: { projectId, snapshot: snapshotHash },
      },
      30000,
    )) as { success?: boolean };

    return result?.success === true;
  } catch {
    return false;
  }
};

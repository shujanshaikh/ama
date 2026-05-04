import type { LanguageModel } from "ai";
import { dispatchToAgent } from "@/lib/do-session";
import type { WorkerBindings } from "@/env";

export type ToolExecutionContext = {
  env: WorkerBindings;
  userId: string;
  projectId?: string;
  projectCwd?: string;
  /** Subagent used for `explore`; set to the same model as the main agent stream. */
  agentLanguageModel: LanguageModel;
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



import { ActionCtx } from "../../_generated/server";
import { internal } from "../../_generated/api";
import { Id } from "../../_generated/dataModel";


export async function waitForToolResult(
  ctx: ActionCtx,
  toolCallId: Id<"toolCalls">,
  timeoutMs: number = 60000
): Promise<any> {
  const startTime = Date.now();
  const pollInterval = 500;

  while (Date.now() - startTime < timeoutMs) {
    const result = await ctx.runQuery(internal.agent.toolQueue.getToolCallResult, {
      toolCallId,
    });

    if (!result) {
      throw new Error("Tool call not found");
    }

    if (result.status === "completed") {
      return result.result;
    }

    if (result.status === "failed") {
      throw new Error(result.error || "Tool execution failed");
    }

    await new Promise((resolve) => setTimeout(resolve, pollInterval));
  }

  throw new Error(`Tool call timed out after ${timeoutMs}ms`);
}

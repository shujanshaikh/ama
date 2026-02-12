import { executeReadFile } from "./read-file";
import { executeDeleteFile } from "./delete-file";
import { executeGrep } from "./grep";
import { executeGlob } from "./glob";
import { executeListDirectory } from "./list-directory";
import { executeRunTerminalCommand } from "./run-terminal-command";

const batchableExecutors: Record<string, (args: any, projectCwd?: string) => Promise<any>> = {
  readFile: executeReadFile,
  deleteFile: executeDeleteFile,
  grep: executeGrep,
  glob: executeGlob,
  listDirectory: executeListDirectory,
  runTerminalCommand: executeRunTerminalCommand,
};

export async function executeBatch(
  input: { tool_calls: Array<{ tool: string; parameters: Record<string, unknown> }> },
  projectCwd?: string,
) {
  const { tool_calls } = input;
  const calls = tool_calls.slice(0, 10);

  const results = await Promise.all(
    calls.map(async (call) => {
      if (call.tool === "batch") {
        return { tool: call.tool, success: false, error: "batch cannot be nested" };
      }
      const executor = batchableExecutors[call.tool];
      if (!executor) {
        return { tool: call.tool, success: false, error: `Unknown tool: ${call.tool}` };
      }
      try {
        const result = await executor(call.parameters, projectCwd);
        return { tool: call.tool, success: result.success !== false, result };
      } catch (error: any) {
        return { tool: call.tool, success: false, error: error.message };
      }
    }),
  );

  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;

  return {
    success: failed === 0,
    message: failed > 0
      ? `Executed ${successful}/${results.length} tools successfully. ${failed} failed.`
      : `All ${successful} tools executed successfully.`,
    totalCalls: results.length,
    successful,
    failed,
    results,
  };
}

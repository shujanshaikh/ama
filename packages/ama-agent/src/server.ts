import { ConvexClient } from "convex/browser";
import pc from "picocolors";
import { pathToFileURL } from "node:url";
import { read_file } from "./tools/read-file";
import { apply_patch } from "./tools/apply-patch";
import { list } from "./tools/ls-dir";
import { grepTool } from "./tools/grep";
import { editFiles } from "./tools/edit-file";
import { deleteFile } from "./tools/delete-file";
import { globTool } from "./tools/glob";

const VERSION = process.env.VERSION ?? "0.0.1";

const API_PATHS = {
  createSession: "agent/toolQueue:createSession",
  updateHeartbeat: "agent/toolQueue:updateHeartbeat",
  subscribeToolCalls: "agent/toolQueue:subscribeToolCalls",
  reportToolResult: "agent/toolQueue:reportToolResult",
} as const;

// interface ToolCall {
//   _id: string;
//   toolName: string;
//   args: any;
// }



async function executeToolLocally(
  toolName: string,
  args: any
): Promise<{ success: boolean; message?: string; content?: any; error?: string }> {
  switch (toolName) {
    case "readFile":
      return await read_file(args);
    case "stringReplace":
      return await apply_patch(args);
    case "list":
      return await list(args);
    case "grep":
      return await grepTool(args);
    case "editFiles":
      return await editFiles(args);
    case "deleteFile":
      return await deleteFile(args);
    case "glob":
      return await globTool(args);
    default:
      return {
        success: false,
        message: `Unknown tool: ${toolName}`,
        error: "UNKNOWN_TOOL",
      };
  }
}

export const startAgent = async (
  convexUrl: string,
  sessionCode?: string,
  workingDirectory?: string
) => {
  if (!convexUrl) {
    console.error(
      pc.red("Error: CONVEX_URL is required. Set it as an environment variable.")
    );
    process.exit(1);
  }

  const client = new ConvexClient(convexUrl);

  try {
    console.log(
      pc.cyan("Connecting to Convex backend...")
    );

    const sessionResult = await client.mutation(
      API_PATHS.createSession as any,
      {
        sessionCode: sessionCode,
        workingDirectory: workingDirectory || process.cwd(),
      }
    );

    const sessionId = sessionResult.sessionId;
    const code = sessionResult.sessionCode;

    console.log(
      `${pc.magenta("⚛")} ${pc.bold("Ama Agent")} ${pc.gray(VERSION)} ${pc.dim("(Ama)")}`
    );
    console.log(
      pc.green(`✓ Connected to Convex backend`)
    );
    console.log(
      pc.yellow(`Session Code: ${pc.bold(code)}`)
    );
    console.log(
      pc.gray("Waiting for tool calls...")
    );

    const heartbeatInterval = setInterval(async () => {
      try {
        await client.mutation(API_PATHS.updateHeartbeat as any, {
          sessionId,
        });
      } catch (error) {
        console.error(pc.red("Heartbeat failed:"), error);
      }
    }, 10000);

    let isProcessing = false;
    const pollInterval = setInterval(async () => {
      if (isProcessing) return;
      
      try {
        const toolCalls = await client.query(
          API_PATHS.subscribeToolCalls as any,
          { sessionId }
        );

        if (toolCalls.length === 0) {
          return;
        }

        isProcessing = true;
        console.log(
          pc.cyan(`\n[${new Date().toLocaleTimeString()}] Processing ${toolCalls.length} tool call(s)...`)
        );

        for (const call of toolCalls) {
          try {
            console.log(
              pc.gray(`  → Executing ${call.toolName}...`)
            );

            const result = await executeToolLocally(call.toolName, call.args);

            await client.mutation(API_PATHS.reportToolResult as any, {
              toolCallId: call._id,
              result: result,
              error: result.success === false ? result.error : undefined,
            });

            if (result.success) {
              console.log(
                pc.green(`  ✓ ${call.toolName} completed successfully`)
              );
            } else {
              console.log(
                pc.red(`  ✗ ${call.toolName} failed: ${result.message}`)
              );
            }
          } catch (error: any) {
            console.error(
              pc.red(`  ✗ Error executing ${call.toolName}:`),
              error
            );

            await client.mutation(API_PATHS.reportToolResult as any, {
              toolCallId: call._id,
              result: null,
              error: error.message || String(error),
            });
          }
        }
        
        isProcessing = false;
      } catch (error) {
        isProcessing = false;
      }
    }, 1000);

    const shutdown = () => {
      console.log(pc.yellow("\nShutting down..."));
      clearInterval(heartbeatInterval);
      clearInterval(pollInterval);
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    process.stdin.resume();
  } catch (error: any) {
    console.error(pc.red("Failed to start agent:"), error);
    process.exit(1);
  }
};

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const convexUrl = process.env.CONVEX_URL;
  const sessionCode = process.env.SESSION_CODE;
  const workingDir = process.env.WORKING_DIRECTORY;

  startAgent(convexUrl || "", sessionCode, workingDir).catch(console.error);
}

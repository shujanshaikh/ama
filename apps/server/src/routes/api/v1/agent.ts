import { Hono } from "hono";
import {
  createUIMessageStream,
  stepCountIs,
  streamText,
  smoothStream,
  JsonToSseTransformStream,
} from "ai";
import { convertToModelMessages } from "ai";
import { tools } from "@/tools/tool";
import {
  getMessagesByChatId,
  saveMessages,
  getProjectByChatId,
  type Chat,
  getChatById,
  getStreamIdsByChatId,
  createStreamId,
  saveSnapshot,
} from "@ama/db";
import { convertToUIMessages } from "@/lib/convertToUIMessage";
import { requestContext } from "@/lib/context";
import { agentStreams } from "@/index";
import { createOpenCodeZenModel, models } from "@/lib/model";
import { buildPlanSystemPrompt } from "@/lib/plan-prompt";
import { createSnapshot, registerProject } from "@/lib/executeTool";
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from "resumable-stream";
import type { ChatMessage } from "@/lib/tool-types";
import { differenceInSeconds } from "date-fns";
import { generateUUID } from "@/lib/utils";
import { ratelimit } from "@/lib/rate-limiter";



export const agentRouter = new Hono();

let globalStreamContext: ResumableStreamContext | null = null;
export type WaitUntil = (promise: Promise<any>) => void;

export const noopWaitUntil: WaitUntil = (promise) => {
  void promise;
};

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: noopWaitUntil,
      });
    } catch (error: any) {
      if (error.message.includes("REDIS_URL")) {
        console.log(
          " > Resumable streams are disabled due to missing REDIS_URL"
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

agentRouter.post("/agent-proxy", async (c) => {
  try {
    const { message, chatId, model, planMode, executePlan, planName } =
      await c.req.json();

    const [token] = agentStreams.keys();
    const { success } = await ratelimit.limit(token!);
    if (!success) {
      return c.json({ error: "Rate limit exceeded" }, 429);
    }
    if (!token) {
      return c.json(
        { error: "run `amai` to make agent acess the local files." },
        503
      );
    }

  

    const modelInfo = models.find((m) => m.id === model);
    if (!modelInfo) {
      return c.json({ error: "Model not found" }, 404);
    }

    await saveMessages({
      messages: [
        {
          chatId: chatId,
          id: crypto.randomUUID(),
          role: "user",
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          model: modelInfo.id,
        },
      ],
    });

    const messagesFromDb = await getMessagesByChatId({ chatId });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message];

    const projectInfo = await getProjectByChatId({ chatId });

    if (projectInfo?.projectId && projectInfo?.projectCwd && token) {
      try {
        // Ensure project is registered with the daemon before creating snapshot
        await registerProject(token, projectInfo.projectId, projectInfo.projectCwd, projectInfo.projectName);
        
        const snapshotHash = await createSnapshot(token, projectInfo.projectId);
        if (snapshotHash) {
          await saveSnapshot({
            chatId,
            hash: snapshotHash,
            projectId: projectInfo.projectId,
          });
          // console.log("[snapshot] Created snapshot before AI task", {
          //   hash: snapshotHash,
          //   chatId,
          // });
        }
      } catch (error) {
        console.warn("[snapshot] Failed to create snapshot", error);
      }
    }

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: chatId });

    const stream = await requestContext.run(
      {
        token,
        projectId: projectInfo?.projectId,
        projectCwd: projectInfo?.projectCwd,
      },
      async () => {
        const uiMessageStream = createUIMessageStream({
          execute: async ({ writer: dataStream }) => {
            const systemPrompt = await buildPlanSystemPrompt(
              planMode || false,
              executePlan || false,
              planName,
              message,
              projectInfo?.projectCwd
            );

            const result = streamText({
              messages: await convertToModelMessages(uiMessages),
              model: createOpenCodeZenModel(model),
              system: systemPrompt,
              temperature: 0.7,
              stopWhen: stepCountIs(25),
              experimental_transform: smoothStream({
                delayInMs: 20,
                chunking: "word",
              }),
              tools: tools,
            });
            result.consumeStream();
            dataStream.merge(
              result.toUIMessageStream({
                sendReasoning: true,
              })
            );
          },

          generateId: generateUUID,

          onFinish: async ({ messages }) => {
            await saveMessages({
              messages: messages.map((message) => ({
                id: crypto.randomUUID(),
                role: message.role,
                parts: message.parts,
                createdAt: new Date(),
                attachments: [],
                chatId: chatId,
                model: modelInfo.id,
                updatedAt: new Date(),
              })),
            });
          },
          onError: (error: unknown) => {
            if (error instanceof Error) {
              return error.message;
            }
            return String(error);
          },
        });

        return uiMessageStream.pipeThrough(new JsonToSseTransformStream());
      }
    );

    const streamContext = getStreamContext();

    if (streamContext) {
      try {
        const resumableStream = await streamContext.resumableStream(
          streamId,
          () => stream
        );
        if (resumableStream) {
          return c.body(resumableStream, 200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });
        }
      } catch (error) {
        console.error("Failed to create resumable stream:", error);
      }
    }

    return c.body(stream, 200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
  } catch (error) {
    console.error("Unhandled error in agent-proxy API:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

agentRouter.get("/agent-proxy/:id/stream", async (c) => {
  const { id: chatId } = c.req.param();

  const streamContext = getStreamContext();
  const resumeRequestedAt = new Date();

  if (!streamContext) {
    return new Response(null, { status: 204 });
  }

  if (!chatId) {
    return c.json({ error: "Chat ID is required" }, 400);
  }

  let chat: Chat | null;

  try {
    chat = await getChatById({ id: chatId });
  } catch {
    return c.json({ error: "Chat not found" }, 404);
  }

  if (!chat) {
    return c.json({ error: "Chat not found" }, 404);
  }

  const streamIds = await getStreamIdsByChatId({ chatId });

  if (!streamIds.length) {
    return c.json({ error: "Stream not found" }, 404);
  }

  const recentStreamId = streamIds.at(-1);

  if (!recentStreamId) {
    return c.json({ error: "Stream not found" }, 404);
  }

  const emptyDataStream = createUIMessageStream<ChatMessage>({
    execute: () => {},
  });

  const stream = await streamContext.resumableStream(recentStreamId, () =>
    emptyDataStream.pipeThrough(new JsonToSseTransformStream())
  );

  if (!stream) {
    const messages = await getMessagesByChatId({ chatId: chatId });
    const mostRecentMessage = messages.at(-1);

    if (!mostRecentMessage) {
      return c.json({ error: "Message not found" }, 404);
    }

    if (mostRecentMessage.role !== "assistant") {
      return c.json({ error: "Message is not an assistant message" }, 400);
    }

    const messageCreatedAt = new Date(mostRecentMessage.createdAt);

    if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
      return c.json({ error: "Message is too old" }, 400);
    }

    const restoredStream = createUIMessageStream<ChatMessage>({
      execute: ({ writer }) => {
        writer.write({
          type: "data-appendMessage",
          data: JSON.stringify(mostRecentMessage),
          transient: true,
        });
      },
    });

    return c.body(
      restoredStream.pipeThrough(new JsonToSseTransformStream()),
      200,
      {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      }
    );
  }

  return c.body(stream, 200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
});

agentRouter.post("/undo", async (c) => {
  try {
    const { chatId, deleteOnly } = await c.req.json();

    if (!chatId) {
      return c.json({ success: false, error: "chatId is required" }, 400);
    }

    const { getLatestSnapshotByChatId, deleteSnapshotsByChatId } = await import(
      "@ama/db"
    );

    const snapshot = await getLatestSnapshotByChatId({ chatId });
    if (!snapshot) {
      return c.json(
        { success: false, error: "No snapshot found for this chat" },
        404
      );
    }

    if (!deleteOnly) {
      const { restoreSnapshot } = await import("@/lib/executeTool");

      const [token] = agentStreams.keys();
      if (!token) {
        return c.json(
          {
            success: false,
            error: "Daemon not connected. Make sure amai is running.",
          },
          503
        );
      }

      console.log("[undo] Restoring snapshot", {
        chatId,
        hash: snapshot.hash,
        projectId: snapshot.projectId,
      });

      const restored = await restoreSnapshot(snapshot.projectId, snapshot.hash);

      if (!restored) {
        return c.json(
          { success: false, error: "Failed to restore files" },
          500
        );
      }
    }

    await deleteSnapshotsByChatId({ chatId });

    console.log("[undo] Restore complete", {
      chatId,
      deleteOnly: !!deleteOnly,
    });
    return c.json({ success: true });
  } catch (error: any) {
    console.error("[undo] Error:", error);
    return c.json(
      { success: false, error: error.message || "Unknown error" },
      500
    );
  }
});

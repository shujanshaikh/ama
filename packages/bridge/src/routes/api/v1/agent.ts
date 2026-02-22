import { Hono } from "hono";
import {
  createUIMessageStream,
  type ModelMessage,
  stepCountIs,
  streamText,
  smoothStream,
  JsonToSseTransformStream,
} from "ai";
import { convertToModelMessages } from "ai";
import { differenceInSeconds } from "date-fns";
import { z } from "zod";
import type { AppEnv } from "@/env";
import { convertToUIMessages } from "@/lib/convertToUIMessage";
import {
  getMessagesByChatId,
  saveMessages,
  getProjectByChatId,
  getProjectUserIdByChatId,
  getChatById,
  getStreamIdsByChatId,
  createStreamId,
  saveSnapshot,
  getLatestSnapshotByChatId,
  deleteSnapshotsByChatId,
} from "@/db";
import {
  createOpenCodeZenModel,
  createGatewayModel,
  isGatewayModel,
  isCodexModel,
  resolveRequestedModel,
  models,
} from "@/lib/model";
import { readGatewayKeyFromVault } from "@/lib/vault";
import { buildPlanSystemPrompt } from "@/lib/plan-prompt";
import { createSnapshot, registerProject, restoreSnapshot } from "@/lib/executeTool";
import { buildCodexProviderOptions, codexRpc, createCodexModel } from "@/lib/codex";
import { generateUUID } from "@/lib/utils";
import { getRatelimit } from "@/lib/rate-limiter";
import { isAgentConnected } from "@/lib/do-session";
import { createTools } from "@/tools/tool";
import type { ChatMessage } from "@/lib/tool-types";
import { registerResumableStream, resumeResumableStream } from "@/lib/resumable";

export const agentRouter = new Hono<AppEnv>();

const agentProxyBodySchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
  model: z.string().min(1, "model is required"),
  message: z
    .object({
      role: z.enum(["system", "user", "assistant"]).optional(),
      parts: z.array(z.unknown()),
    })
    .passthrough(),
  planMode: z.boolean().optional(),
  executePlan: z.boolean().optional(),
  planName: z.string().optional(),
});

const undoBodySchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
  deleteOnly: z.boolean().optional(),
});

function buildCodexMessages(messages: ModelMessage[]): ModelMessage[] {
  const cleaned: ModelMessage[] = [];

  for (const message of messages) {
    if (message.role === "system" || message.role === "tool") {
      continue;
    }

    if (message.role === "assistant" && Array.isArray(message.content)) {
      const filteredContent = message.content.filter((part) => {
        return part.type !== "tool-call" && part.type !== "tool-result";
      });

      if (filteredContent.length === 0) {
        continue;
      }

      cleaned.push({
        ...message,
        content: filteredContent,
      });
      continue;
    }

    cleaned.push(message);
  }

  return cleaned;
}

function withSsePreamble(stream: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
  const preamble = new TextEncoder().encode(": connected\n\n");
  const reader = stream.getReader();
  let sentPreamble = false;

  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (!sentPreamble) {
        sentPreamble = true;
        controller.enqueue(preamble);
        return;
      }

      const { done, value } = await reader.read();
      if (done) {
        controller.close();
        return;
      }
      if (value) {
        controller.enqueue(value);
      }
    },
    async cancel(reason) {
      try {
        await reader.cancel(reason);
      } catch {
        // ignore cancellation errors
      }
    },
  });
}

agentRouter.post("/agent-proxy", async (c) => {
  try {
    const userId = c.get("userId");

    const connected = await isAgentConnected(c.env, userId);
    if (!connected) {
      return c.json(
        { error: "run `amai` to make agent access the local files." },
        503,
      );
    }

    try {
      const { success } = await getRatelimit(c.env).limit(userId);
      if (!success) {
        return c.json({ error: "Rate limit exceeded" }, 429);
      }
    } catch {
      // Skip rate limit when redis is not configured
    }

    const parseResult = agentProxyBodySchema.safeParse(await c.req.json());
    if (!parseResult.success) {
      const msg =
        parseResult.error.issues
          .map((e: { message: string }) => e.message)
          .join("; ") || "Invalid request body";
      return c.json({ error: msg }, 400);
    }

    const { message, chatId, model, planMode, executePlan, planName } =
      parseResult.data;

    let resolvedModelId = resolveRequestedModel(model);
    if (resolvedModelId === "openai/gpt-5.2-codex") {
      try {
        const codexStatus = await codexRpc.status(c.env, userId);
        if (codexStatus.authenticated) {
          resolvedModelId = resolveRequestedModel(model, { preferCodex: true });
        }
      } catch {
        // keep gateway route if codex status check fails
      }
    }

    const ownerId = await getProjectUserIdByChatId(c.env, { chatId });
    if (ownerId !== userId) {
      return c.json({ error: "Chat not found" }, 404);
    }

    const modelInfo = models.find((m) => m.id === resolvedModelId);
    if (!modelInfo) {
      return c.json({ error: "Model not found" }, 404);
    }

    await saveMessages(c.env, {
      messages: [
        {
          chatId,
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

    const messagesFromDb = await getMessagesByChatId(c.env, { chatId });
    const uiMessages = [...convertToUIMessages(messagesFromDb), message] as Parameters<
      typeof convertToModelMessages
    >[0];

    const projectInfo = await getProjectByChatId(c.env, { chatId });

    if (projectInfo?.projectId && projectInfo?.projectCwd) {
      try {
        await registerProject(
          c.env,
          userId,
          projectInfo.projectId,
          projectInfo.projectCwd,
          projectInfo.projectName,
        );

        const snapshotHash = await createSnapshot(c.env, userId, projectInfo.projectId);
        if (snapshotHash) {
          await saveSnapshot(c.env, {
            chatId,
            hash: snapshotHash,
            projectId: projectInfo.projectId,
          });
        }
      } catch {
        // ignore snapshot failures
      }
    }

    let languageModel;
    if (isCodexModel(modelInfo.id)) {
      const cleanModelId = modelInfo.id.replace(/^codex\//, "");
      languageModel = await createCodexModel(cleanModelId, c.env, userId);
    } else if (isGatewayModel(modelInfo.id)) {
      const userKey = await readGatewayKeyFromVault(c.env, userId);
      if (!userKey) {
        return c.json(
          {
            error:
              "No AI Gateway API key configured. Please add your API key in settings.",
          },
          400,
        );
      }
      languageModel = createGatewayModel(modelInfo.id, userKey);
    } else {
      languageModel = createOpenCodeZenModel(modelInfo.id, c.env);
    }

    const streamId = generateUUID();
    await createStreamId(c.env, { streamId, chatId });

    const toolContext = {
      env: c.env,
      userId,
      projectId: projectInfo?.projectId,
      projectCwd: projectInfo?.projectCwd,
    };

    const tools = createTools(toolContext);

    const stream = await (async () => {
      const uiMessageStream = createUIMessageStream({
        execute: async ({ writer: dataStream }) => {
          const systemPrompt = await buildPlanSystemPrompt(
            planMode || false,
            executePlan || false,
            planName,
            message,
            projectInfo?.projectCwd,
            toolContext,
          );

          const modelMessages = await convertToModelMessages(uiMessages);
          const codex = isCodexModel(modelInfo.id);
          const messagesForModel = codex
            ? buildCodexMessages(modelMessages as ModelMessage[])
            : modelMessages;

          const result = streamText({
            messages: messagesForModel,
            model: languageModel,
            system: systemPrompt,
            temperature: codex ? undefined : 1.0,
            stopWhen: stepCountIs(45),
            experimental_transform: smoothStream({
              delayInMs: 20,
              chunking: "word",
            }),
            tools,
            providerOptions: codex
              ? buildCodexProviderOptions(systemPrompt)
              : undefined,
          });

          result.consumeStream();
          dataStream.merge(
            result.toUIMessageStream({
              sendReasoning: true,
            }),
          );
        },

        generateId: generateUUID,

        onFinish: async ({ messages }) => {
          await saveMessages(c.env, {
            messages: messages.map((msg) => ({
              id: crypto.randomUUID(),
              role: msg.role,
              parts: msg.parts,
              createdAt: new Date(),
              attachments: [],
              chatId,
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

      return uiMessageStream
        .pipeThrough(new JsonToSseTransformStream())
        .pipeThrough(new TextEncoderStream());
    })();

    const { stream: resumableStream, done } = registerResumableStream(
      streamId,
      chatId,
      stream,
    );
    c.executionCtx?.waitUntil(done);

    return c.body(withSsePreamble(resumableStream), 200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
  } catch {
    return c.json({ error: "Internal server error" }, 500);
  }
});

agentRouter.post("/codex/auth/start", async (c) => {
  try {
    const userId = c.get("userId");
    if (!(await isAgentConnected(c.env, userId))) {
      return c.json(
        { error: "run `amai` to make agent access the local files." },
        503,
      );
    }

    const result = await codexRpc.startAuth(c.env, userId);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to start Codex auth" }, 500);
  }
});

agentRouter.get("/codex/auth/status", async (c) => {
  try {
    const userId = c.get("userId");
    if (!(await isAgentConnected(c.env, userId))) {
      return c.json({ authenticated: false });
    }

    const result = await codexRpc.status(c.env, userId);
    return c.json(result);
  } catch {
    return c.json({ authenticated: false });
  }
});

agentRouter.post("/codex/auth/logout", async (c) => {
  try {
    const userId = c.get("userId");
    if (!(await isAgentConnected(c.env, userId))) {
      return c.json(
        { error: "run `amai` to make agent access the local files." },
        503,
      );
    }

    const result = await codexRpc.logout(c.env, userId);
    return c.json(result);
  } catch (error: any) {
    return c.json({ error: error.message || "Failed to logout Codex auth" }, 500);
  }
});

agentRouter.get("/agent-proxy/:id/stream", async (c) => {
  const userId = c.get("userId");
  const { id: chatId } = c.req.param();
  const resumeRequestedAt = new Date();

  if (!chatId) {
    return c.json({ error: "Chat ID is required" }, 400);
  }

  const ownerId = await getProjectUserIdByChatId(c.env, { chatId });
  if (ownerId !== userId) {
    return c.json({ error: "Chat not found" }, 404);
  }

  const chat = await getChatById(c.env, { id: chatId });
  if (!chat) {
    return c.json({ error: "Chat not found" }, 404);
  }

  const streamIds = await getStreamIdsByChatId(c.env, { chatId });
  if (!streamIds.length) {
    return new Response(null, { status: 204 });
  }

  const recentStreamId = streamIds.at(-1);
  if (!recentStreamId) {
    return new Response(null, { status: 204 });
  }

  const resumableStream = resumeResumableStream(recentStreamId);
  if (resumableStream) {
    return c.body(withSsePreamble(resumableStream), 200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
  }

  const messages = await getMessagesByChatId(c.env, { chatId });
  const mostRecentMessage = messages.at(-1);
  if (!mostRecentMessage) {
    return new Response(null, { status: 204 });
  }

  if (mostRecentMessage.role !== "assistant") {
    return new Response(null, { status: 204 });
  }

  const messageCreatedAt = new Date(mostRecentMessage.createdAt);
  if (differenceInSeconds(resumeRequestedAt, messageCreatedAt) > 15) {
    return new Response(null, { status: 204 });
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
    restoredStream
      .pipeThrough(new JsonToSseTransformStream())
      .pipeThrough(new TextEncoderStream()),
    200,
    {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  );
});

agentRouter.post("/undo", async (c) => {
  try {
    const userId = c.get("userId");
    const parseResult = undoBodySchema.safeParse(await c.req.json());
    if (!parseResult.success) {
      const msg =
        parseResult.error.issues
          .map((e: { message: string }) => e.message)
          .join("; ") || "Invalid request body";
      return c.json({ success: false, error: msg }, 400);
    }

    const { chatId, deleteOnly } = parseResult.data;

    const ownerId = await getProjectUserIdByChatId(c.env, { chatId });
    if (ownerId !== userId) {
      return c.json({ success: false, error: "Chat not found" }, 404);
    }

    const snapshot = await getLatestSnapshotByChatId(c.env, { chatId });
    if (!snapshot) {
      return c.json(
        { success: false, error: "No snapshot found for this chat" },
        404,
      );
    }

    if (!deleteOnly) {
      if (!(await isAgentConnected(c.env, userId))) {
        return c.json(
          {
            success: false,
            error: "Daemon not connected. Make sure amai is running.",
          },
          503,
        );
      }

      const restored = await restoreSnapshot(
        c.env,
        userId,
        snapshot.projectId,
        snapshot.hash,
      );

      if (!restored) {
        return c.json({ success: false, error: "Failed to restore files" }, 500);
      }
    }

    await deleteSnapshotsByChatId(c.env, { chatId });
    return c.json({ success: true });
  } catch (error: any) {
    return c.json(
      { success: false, error: error.message || "Unknown error" },
      500,
    );
  }
});

export function createAgentRouter() {
  return agentRouter;
}

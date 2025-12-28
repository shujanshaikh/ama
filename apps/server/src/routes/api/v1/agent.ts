import { Hono } from "hono";
import { createUIMessageStream, stepCountIs, streamText, smoothStream, JsonToSseTransformStream } from "ai"
import { convertToModelMessages } from "ai"
import { tools } from "@/tools/tool";
import { getMessagesByChatId, saveMessages, getProjectByChatId, type Chat, getChatById, getStreamIdsByChatId, createStreamId } from "@ama/db";
import { convertToUIMessages } from "@/lib/convertToUIMessage";
import { requestContext } from "@/lib/context";
import { agentStreams } from "@/index";
import { models } from "@/lib/model";
import { buildPlanSystemPrompt } from "@/lib/plan-prompt";
import {
	createResumableStreamContext,
	type ResumableStreamContext,
} from "resumable-stream";
import type { ChatMessage } from "@/lib/tool-types";
import { differenceInSeconds } from "date-fns";
import { generateUUID } from "@/lib/utils";



export const agentRouter = new Hono();

let globalStreamContext: ResumableStreamContext | null = null;
export type WaitUntil = (promise: Promise<any>) => void

export const noopWaitUntil: WaitUntil = (promise) => {
	void promise
}

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
		const { message, chatId, model, planMode, executePlan, planName } = await c.req.json();

		const [token] = agentStreams.keys();

		if (!token) {
			return c.json({ error: 'run `amai` to make agent acess the local files.' }, 503);
		}

		const modelInfo = models.find((m) => m.id === model);
		if (!modelInfo) {
			return c.json({ error: 'Model not found' }, 404);
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

		const streamId = generateUUID();
		await createStreamId({ streamId, chatId: chatId });

		const stream = await requestContext.run({ token, projectId: projectInfo?.projectId, projectCwd: projectInfo?.projectCwd }, async () => {
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
						messages: convertToModelMessages(uiMessages),
						model: modelInfo.id,
						system: systemPrompt,
						temperature: 0.7,
						stopWhen: stepCountIs(10),
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
						}),
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
		});

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
						"Connection": "keep-alive",
					});
				}
			} catch (error) {
				console.error("Failed to create resumable stream:", error);
			}
		}

		return c.body(stream, 200, {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			"Connection": "keep-alive",
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
		execute: () => { },
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
				"Connection": "keep-alive",
			}
		);
	}

	return c.body(stream, 200, {
		"Content-Type": "text/event-stream",
		"Cache-Control": "no-cache",
		"Connection": "keep-alive",
	});
});
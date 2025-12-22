import { Hono } from "hono";
import { createUIMessageStreamResponse, createUIMessageStream, stepCountIs, streamText, smoothStream } from "ai"
import { convertToModelMessages } from "ai"
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { tools } from "@/tools/tool";
import { openrouter } from "@openrouter/ai-sdk-provider"
import { getMessagesByChatId, saveMessages, getProjectByChatId } from "@ama/db";
import { convertToUIMessages } from "@/lib/convertToUIMessage";
import { requestContext } from "@/lib/context";
import { agentStreams } from "@/index";


export const agentRouter = new Hono();

agentRouter.post("/agent-proxy", async (c) => {
	const { message, chatId } = await c.req.json();

	const [token] = agentStreams.keys();

	if (!token) {
		return c.json({ error: 'run `ama` to make agent acess the local files.' }, 503);
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
				model: "kwaipilot/kat-coder-pro:free",
			},
		],
	});


	const messagesFromDb = await getMessagesByChatId({ chatId });
	const uiMessages = [...convertToUIMessages(messagesFromDb), message];

	// Get project info for this chat
	const projectInfo = await getProjectByChatId({ chatId });

	return requestContext.run({ token, projectId: projectInfo?.projectId, projectCwd: projectInfo?.projectCwd }, () => {
		return createUIMessageStreamResponse({
			stream: createUIMessageStream({
				execute: ({ writer: dataStream }) => {
					const result = streamText({
						messages: convertToModelMessages(uiMessages),
						model: openrouter.chat("kwaipilot/kat-coder-pro:free"),
						system: SYSTEM_PROMPT,
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
							sendReasoning: false,
						}),
					);
				},
				onFinish: async ({ messages }) => {
					await saveMessages({
						messages: messages.map((message) => ({
							id: crypto.randomUUID(),
							role: message.role,
							parts: message.parts,
							createdAt: new Date(),
							attachments: [],
							chatId: chatId,
							model: "kwaipilot/kat-coder-pro:free",
							updatedAt: new Date(),
						})),
					});
				},
				onError : (error : unknown) => {
					if (error instanceof Error) {
						return error.message;
					}
					return String(error);
				},
			}),
		});
	});
});
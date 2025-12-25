import { Hono } from "hono";
import { createUIMessageStreamResponse, createUIMessageStream, stepCountIs, streamText, smoothStream } from "ai"
import { convertToModelMessages } from "ai"
import { tools } from "@/tools/tool";
import { getMessagesByChatId, saveMessages, getProjectByChatId } from "@ama/db";
import { convertToUIMessages } from "@/lib/convertToUIMessage";
import { requestContext } from "@/lib/context";
import { agentStreams } from "@/index";
import { models } from "@/lib/model";
import { buildPlanSystemPrompt } from "@/lib/plan-prompt";


export const agentRouter = new Hono();

agentRouter.post("/agent-proxy", async (c) => {
	const { message, chatId , model, planMode, executePlan, planName } = await c.req.json();

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

	return requestContext.run({ token, projectId: projectInfo?.projectId, projectCwd: projectInfo?.projectCwd }, () => {
		return createUIMessageStreamResponse({
			stream: createUIMessageStream({
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
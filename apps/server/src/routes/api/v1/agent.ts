import { Hono } from "hono";
import { createUIMessageStreamResponse, createUIMessageStream, stepCountIs, streamText , smoothStream } from "ai"
import { convertToModelMessages } from "ai"
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { tool } from "@/tools/tool";
import { openrouter } from "@openrouter/ai-sdk-provider"

export const agentRouter = new Hono();

agentRouter.post("/agent", async (c) => {
    const { messages } = await c.req.json();

	
	return createUIMessageStreamResponse({
		stream: createUIMessageStream({
		  execute: ({ writer: dataStream }) => {
			const result = streamText({
			  messages: convertToModelMessages(messages),
			  model: openrouter.chat("kwaipilot/kat-coder-pro:free"),
			  system: SYSTEM_PROMPT,
			  temperature: 0.7,
			  stopWhen: stepCountIs(20),
			  experimental_transform: smoothStream({
				delayInMs: 10,
				chunking: "word",
			  }),
			  tools: tool,

			});
			result.consumeStream();
			dataStream.merge(
			  result.toUIMessageStream({
				sendReasoning: true,
			  }),
			);
		  },
		  onFinish: async ({  }) => {
			  console.log("Finished");
			},
		}),
	});
});
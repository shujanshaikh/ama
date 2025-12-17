import { Hono } from "hono";
import { createUIMessageStreamResponse, createUIMessageStream, stepCountIs, streamText , smoothStream } from "ai"
import { convertToModelMessages } from "ai"
import { SYSTEM_PROMPT } from "@/lib/prompt";
import { tools } from "@/tools/tool";
import { openrouter } from "@openrouter/ai-sdk-provider"
import { getMessagesByChatId, saveMessages } from "@/db/queries";
import { convertToUIMessages } from "@/lib/convertoUiMessages";
import { requestContext } from "@/lib/context";
import { agentStreams } from "@/index";


export const agentRouter = new Hono();

agentRouter.post("/agent-proxy", async (c) => {
    const { messages , chatId , model } = await c.req.json();
    
    const [token] = agentStreams.keys();
    
    if (!token) {
        return c.json({ error: 'No CLI agent connected. Please run `ama` in your project directory.' }, 503);
    }


	// await saveMessages({
	// 	messages: [
	// 	  { 
	// 		chatId: chatId,
	// 		id: message.id,
	// 		role: "user",
	// 		parts: message.parts,
	// 		attachments: [],
	// 		createdAt: new Date(),
	// 		updatedAt: new Date(),
	// 		model: model,
	// 	  },
	// 	],
	//   });
	
	
	//   const messagesFromDb = await getMessagesByChatId({ chatId });
	//   const uiMessages = [...convertToUIMessages(messagesFromDb), message];

	return requestContext.run({ token }, () => {
		return createUIMessageStreamResponse({
			stream: createUIMessageStream({
			  execute: ({ writer: dataStream }) => {
				const result = streamText({
				  messages: convertToModelMessages(messages),
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
					sendReasoning: true,
				  }),
				);
			  },
			  onFinish: async ({ messages }) => {
				// await saveMessages({
				// 	messages: messages.map((message) => ({
				// 	  id: crypto.randomUUID(),
				// 	  role: message.role,
				// 	  parts: message.parts,
				// 	  createdAt: new Date(),
				// 	  attachments: [],
				// 	  chatId: chatId,
				// 	  model: model,
				// 	  updatedAt: new Date(),
				// 	})),
				//   });
				},
			}),
		});
	});
});
import { router, protectedProcedure } from "../index";
import { z } from "zod";
import { generateText } from "ai";
import { db, chat, eq, getProjectUserIdByChatId } from "@ama/db";
import { openai } from "@ai-sdk/openai";

export const generateTitleRouter = router({
    generateTitle: protectedProcedure.input(z.object({
        message: z.string(),
        chatId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const { message, chatId } = input;
        const userId = ctx.session.user?.id!;
        const ownerId = await getProjectUserIdByChatId({ chatId });
        if (ownerId !== userId) {
            throw new Error("Chat not found");
        }
        const title = await generateTitle(message);
        if (!title) {
            throw new Error("Failed to generate title");
        }
        try {
            await db.update(chat).set({ title }).where(eq(chat.id, chatId));
        } catch (error) {
            throw new Error("Failed to save title");
        }
        return { title };
    }),
});

const titlePrompt = `
You are an AI assistant that generates short, descriptive titles for new chats.
Given a user's chat message, create a concise title (max 8 words) that clearly captures its topic or intent.
Do NOT use quotes, and do NOT include the user's name.
Respond only with the title.
`;

async function generateTitle(message: string) {
    try {
        const { text } = await generateText({
            model: openai("gpt-4.1-mini-2025-04-14"),
            system: titlePrompt,
            prompt: message,
            maxOutputTokens : 50,
        });
        return text;
    } catch (error) {
        console.error('Failed to generate title:', error);
        return null;
    }
}
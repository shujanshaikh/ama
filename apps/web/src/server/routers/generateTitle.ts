import { router, protectedProcedure } from "../index";
import { z } from "zod";
import { generateText, type LanguageModel } from "ai";
import { google } from "@ai-sdk/google";
import { db, chat, eq } from "@ama/db";

export const generateTitleRouter = router({
    generateTitle: protectedProcedure.input(z.object({
        message: z.string(),
        chatId: z.string(),
    })).mutation(async ({ input }) => {
        const { message, chatId } = input;
        const title = await generateTitle(message);
        if (!title) {
            throw new Error("Failed to generate title");
        }
        try {
            await db.update(chat).set({ title }).where(eq(chat.id, chatId));
        } catch (error) {
            throw new Error("Failed to save title");
        }
        
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
            model: google("gemini-3-flash-preview") as unknown as LanguageModel,
            system: titlePrompt,
            prompt: message,
        });
        return text;
    } catch (error) {
        console.error('Failed to generate title:', error);
        return null;
    }
}
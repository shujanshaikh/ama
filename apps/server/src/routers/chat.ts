import { db } from "@/db";
import { protectedProcedure, router } from "./trpc";
import { z } from "zod";
import { chat } from "@/db/schema";
import { eq } from "drizzle-orm";

export const chatRouter = router({
    createChat: protectedProcedure.input(z.object({
        title: z.string(),
        projectId: z.string(),
    })).mutation(async ({ input }) => {
        const { title, projectId } = input;
        const [newChat] = await db.insert(chat).values({
            title,
            projectId,
        }).returning();
        return newChat?.id;
    }),

    getChats: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ input }) => {
        const { projectId } = input;
        const chats = await db.select().from(chat).where(eq(chat.projectId, projectId));
        return chats;
    }),
});
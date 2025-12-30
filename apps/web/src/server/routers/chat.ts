import { db, chat, getMessagesByChatId, eq, getLatestSnapshotByChatId, deleteSnapshotsByChatId, getProjectByChatId } from "@ama/db";
import { protectedProcedure, router } from "../index";
import { convertToUIMessages } from "../lib/convertToUIMessage";
import { z } from "zod";


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

    getMessages: protectedProcedure.input(z.object({
        chatId: z.string(),
    })).query(async ({ input }) => {
        const { chatId } = input;
        const dbMessages = await getMessagesByChatId({ chatId });
        const uiMessages = convertToUIMessages(dbMessages);
        return uiMessages;
    }),

    getLatestSnapshot: protectedProcedure.input(z.object({
        chatId: z.string(),
    })).query(async ({ input }) => {
        const { chatId } = input;
        const snapshot = await getLatestSnapshotByChatId({ chatId });
        return snapshot;
    }),

    undoChanges: protectedProcedure.input(z.object({
        chatId: z.string(),
    })).mutation(async ({ input }) => {
        const { chatId } = input;

        const snapshot = await getLatestSnapshotByChatId({ chatId });
        if (!snapshot) {
            return { success: false, error: "No snapshot found for this chat" };
        }

        const projectInfo = await getProjectByChatId({ chatId });
        if (!projectInfo) {
            return { success: false, error: "Project not found" };
        }

        await deleteSnapshotsByChatId({ chatId });

        return {
            success: true,
            snapshot: {
                hash: snapshot.hash,
                projectId: snapshot.projectId,
            }
        };
    }),
});
import { db, chat, project, getMessagesByChatId, eq, and, getLatestSnapshotByChatId, deleteSnapshotsByChatId, getProjectByChatId, getProjectUserIdByChatId } from "@ama/db";
import { protectedProcedure, router } from "../index";
import { convertToUIMessages } from "../lib/convertToUIMessage";
import { z } from "zod";


export const chatRouter = router({
    createChat: protectedProcedure.input(z.object({
        title: z.string(),
        projectId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const { title, projectId } = input;
        const userId = ctx.session.user?.id!;
        const [ownedProject] = await db.select().from(project).where(
            and(eq(project.id, projectId), eq(project.userId, userId))
        ).limit(1);
        if (!ownedProject) {
            throw new Error("Project not found");
        }
        const [newChat] = await db.insert(chat).values({
            title,
            projectId,
        }).returning();
        return newChat?.id;
    }),

    getChats: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ ctx, input }) => {
        const { projectId } = input;
        const userId = ctx.session.user?.id!;
        const [ownedProject] = await db.select().from(project).where(
            and(eq(project.id, projectId), eq(project.userId, userId))
        ).limit(1);
        if (!ownedProject) {
            throw new Error("Project not found");
        }
        const chats = await db.select().from(chat).where(eq(chat.projectId, projectId));
        return chats;
    }),

    getMessages: protectedProcedure.input(z.object({
        chatId: z.string(),
    })).query(async ({ ctx, input }) => {
        const { chatId } = input;
        const userId = ctx.session.user?.id!;
        const ownerId = await getProjectUserIdByChatId({ chatId });
        if (ownerId !== userId) {
            throw new Error("Chat not found");
        }
        const dbMessages = await getMessagesByChatId({ chatId });
        const uiMessages = convertToUIMessages(dbMessages);
        return uiMessages;
    }),

    getLatestSnapshot: protectedProcedure.input(z.object({
        chatId: z.string(),
    })).query(async ({ ctx, input }) => {
        const { chatId } = input;
        const userId = ctx.session.user?.id!;
        const ownerId = await getProjectUserIdByChatId({ chatId });
        if (ownerId !== userId) {
            throw new Error("Chat not found");
        }
        const snapshot = await getLatestSnapshotByChatId({ chatId });
        return snapshot;
    }),

    undoChanges: protectedProcedure.input(z.object({
        chatId: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const { chatId } = input;
        const userId = ctx.session.user?.id!;
        const ownerId = await getProjectUserIdByChatId({ chatId });
        if (ownerId !== userId) {
            return { success: false, error: "Chat not found" };
        }

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
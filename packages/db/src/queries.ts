import { message, type DBMessage, chat, project } from "./schema";
import { db } from "./index";
import { eq } from "drizzle-orm";
import { asc } from "drizzle-orm";

export async function saveMessages({
    messages,
  }: {
    messages: Array<DBMessage>;
  }) {
    try {
      const savedMessages = await db.insert(message).values(messages).returning();
      return savedMessages;
    } catch (error) {
      throw new Error("Failed to save messages: " + error);
    }
  }

  export async function getMessagesByChatId({ chatId }: { chatId: string }) {
    try {
      return await db
        .select()
        .from(message)
        .where(eq(message.chatId, chatId))
        .orderBy(asc(message.createdAt));
    } catch (error) {
      throw new Error("Failed to get messages by chat id" + error);
    }
  }

  export async function getProjectByChatId({ chatId }: { chatId: string }) {
    try {
      const result = await db
        .select({
          projectId: project.id,
          projectCwd: project.cwd,
          projectName: project.name,
        })
        .from(chat)
        .innerJoin(project, eq(chat.projectId, project.id))
        .where(eq(chat.id, chatId))
        .limit(1);
      
      return result[0] || null;
    } catch (error) {
      throw new Error("Failed to get project by chat id: " + error);
    }
  }


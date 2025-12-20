import { message, type DBMessage } from "./schema";
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


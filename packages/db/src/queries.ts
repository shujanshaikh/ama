import { message, type DBMessage, chat, project, stream, snapshot, type Snapshot } from "./schema";
import { db } from "./index";
import { eq } from "drizzle-orm";
import { asc, desc } from "drizzle-orm";

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


export async function getChatById({ id }: { id: string }) {
  try {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
    if (!selectedChat) {
      return null;
    }

    return selectedChat;
  } catch (_error) {
    throw new Error("Failed to get chat by id: " + _error);
  }
}


export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
  try {
    const streamIds = await db
      .select({ id: stream.id })
      .from(stream)
      .where(eq(stream.chatId, chatId))
      .orderBy(asc(stream.createdAt))
      .execute();

    return streamIds.map(({ id }) => id);
  } catch (_error) {
    throw new Error("Failed to get stream ids by chat id: " + _error);
  }
}

export async function createStreamId({
  streamId,
  chatId,
}: {
  streamId: string;
  chatId: string;
}) {
  try {
    await db
      .insert(stream)
      .values({ id: streamId, chatId, createdAt: new Date() });
  } catch (_error) {
    throw new Error("Failed to create stream id: " + _error);
  }
}

// Snapshot queries for undo functionality
export async function saveSnapshot({
  chatId,
  hash,
  projectId,
}: {
  chatId: string;
  hash: string;
  projectId: string;
}) {
  try {
    const [saved] = await db
      .insert(snapshot)
      .values({ chatId, hash, projectId })
      .returning();
    return saved;
  } catch (error) {
    throw new Error("Failed to save snapshot: " + error);
  }
}

export async function getLatestSnapshotByChatId({ chatId }: { chatId: string }): Promise<Snapshot | null> {
  try {
    const [result] = await db
      .select()
      .from(snapshot)
      .where(eq(snapshot.chatId, chatId))
      .orderBy(desc(snapshot.createdAt))
      .limit(1);
    return result || null;
  } catch (error) {
    throw new Error("Failed to get latest snapshot: " + error);
  }
}

export async function deleteSnapshotsByChatId({ chatId }: { chatId: string }) {
  try {
    await db.delete(snapshot).where(eq(snapshot.chatId, chatId));
  } catch (error) {
    throw new Error("Failed to delete snapshots: " + error);
  }
}
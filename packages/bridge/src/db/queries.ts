import { asc, desc, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { chat, message, project, snapshot, stream, type DBMessage, type Snapshot } from "@/db/schema";
import type { WorkerBindings } from "@/env";

export async function saveMessages(
  env: WorkerBindings,
  { messages }: { messages: Array<DBMessage> },
) {
  const db = getDb(env);
  return db.insert(message).values(messages).returning();
}

export async function getMessagesByChatId(env: WorkerBindings, { chatId }: { chatId: string }) {
  const db = getDb(env);
  return db.select().from(message).where(eq(message.chatId, chatId)).orderBy(asc(message.createdAt));
}

export async function getProjectByChatId(env: WorkerBindings, { chatId }: { chatId: string }) {
  const db = getDb(env);
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
}

export async function getProjectUserIdByChatId(
  env: WorkerBindings,
  { chatId }: { chatId: string },
): Promise<string | null> {
  const db = getDb(env);
  const result = await db
    .select({ userId: project.userId })
    .from(chat)
    .innerJoin(project, eq(chat.projectId, project.id))
    .where(eq(chat.id, chatId))
    .limit(1);

  return result[0]?.userId ?? null;
}

export async function getChatById(env: WorkerBindings, { id }: { id: string }) {
  const db = getDb(env);
  const [selectedChat] = await db.select().from(chat).where(eq(chat.id, id));
  return selectedChat || null;
}

export async function getStreamIdsByChatId(env: WorkerBindings, { chatId }: { chatId: string }) {
  const db = getDb(env);
  const streamIds = await db
    .select({ id: stream.id })
    .from(stream)
    .where(eq(stream.chatId, chatId))
    .orderBy(asc(stream.createdAt))
    .execute();

  return streamIds.map(({ id }) => id);
}

export async function createStreamId(
  env: WorkerBindings,
  { streamId, chatId }: { streamId: string; chatId: string },
) {
  const db = getDb(env);
  await db.insert(stream).values({ id: streamId, chatId, createdAt: new Date() });
}

export async function saveSnapshot(
  env: WorkerBindings,
  { chatId, hash, projectId }: { chatId: string; hash: string; projectId: string },
) {
  const db = getDb(env);
  const [saved] = await db.insert(snapshot).values({ chatId, hash, projectId }).returning();
  return saved;
}

export async function getLatestSnapshotByChatId(
  env: WorkerBindings,
  { chatId }: { chatId: string },
): Promise<Snapshot | null> {
  const db = getDb(env);
  const [result] = await db
    .select()
    .from(snapshot)
    .where(eq(snapshot.chatId, chatId))
    .orderBy(desc(snapshot.createdAt))
    .limit(1);

  return result || null;
}

export async function deleteSnapshotsByChatId(env: WorkerBindings, { chatId }: { chatId: string }) {
  const db = getDb(env);
  await db.delete(snapshot).where(eq(snapshot.chatId, chatId));
}

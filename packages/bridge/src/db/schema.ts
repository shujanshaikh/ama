import { relations, type InferSelectModel } from "drizzle-orm";
import {
  jsonb,
  pgTable,
  pgTableCreator,
  text,
  timestamp,
  uuid,
  varchar,
  primaryKey,
  foreignKey,
} from "drizzle-orm/pg-core";

export const createTable = pgTableCreator((name) => `ama_${name}`);

export const project = createTable("project", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  userId: text("user_id").notNull(),
  cwd: text("cwd").notNull(),
  gitRepo: text("git_repo").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Project = InferSelectModel<typeof project>;

export const chat = createTable("chat", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  projectId: uuid("project_id").notNull().references(() => project.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type Chat = InferSelectModel<typeof chat>;

export const message = createTable("message", {
  id: uuid("id").primaryKey().defaultRandom().notNull(),
  chatId: uuid("chat_id").notNull().references(() => chat.id),
  model: text("model"),
  parts: jsonb("parts").notNull(),
  role: varchar("role").notNull(),
  attachments: jsonb("attachments"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type DBMessage = InferSelectModel<typeof message>;

export const projectRelations = relations(project, ({ many }) => ({
  chats: many(chat),
}));

export const chatRelations = relations(chat, ({ one, many }) => ({
  project: one(project, {
    fields: [chat.projectId],
    references: [project.id],
  }),
  messages: many(message),
}));

export const messageRelations = relations(message, ({ one }) => ({
  chat: one(chat, {
    fields: [message.chatId],
    references: [chat.id],
  }),
}));

export const stream = pgTable(
  "Stream",
  {
    id: uuid("id").notNull().defaultRandom(),
    chatId: uuid("chatId").notNull(),
    createdAt: timestamp("createdAt").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.id] }),
    chatRef: foreignKey({
      columns: [table.chatId],
      foreignColumns: [chat.id],
    }),
  }),
);

export type Stream = InferSelectModel<typeof stream>;

export const snapshot = createTable("snapshot", {
  id: uuid("id").primaryKey().defaultRandom(),
  chatId: uuid("chat_id").notNull().references(() => chat.id),
  hash: text("hash").notNull(),
  projectId: uuid("project_id").notNull().references(() => project.id),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Snapshot = InferSelectModel<typeof snapshot>;

export const snapshotRelations = relations(snapshot, ({ one }) => ({
  chat: one(chat, {
    fields: [snapshot.chatId],
    references: [chat.id],
  }),
  project: one(project, {
    fields: [snapshot.projectId],
    references: [project.id],
  }),
}));

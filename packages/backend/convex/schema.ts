import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Table for CLI sessions
  sessions: defineTable({
    sessionCode: v.string(),
    workingDirectory: v.optional(v.string()),
    status: v.union(v.literal("active"), v.literal("inactive")),
    lastHeartbeat: v.number(),
    createdAt: v.number(),
  })
    .index("by_code", ["sessionCode"])
    .index("by_status", ["status"]),

  // Table for queued tool calls
  toolCalls: defineTable({
    threadId: v.string(),
    sessionId: v.id("sessions"),
    toolName: v.string(),
    args: v.any(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed")
    ),
    result: v.optional(v.any()),
    error: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_session_status", ["sessionId", "status"])
    .index("by_thread", ["threadId"]),
});

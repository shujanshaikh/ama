import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "../_generated/server";
import { Id } from "../_generated/dataModel";


function generateRandomSessionCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const createSession = mutation({
  args: {
    workingDirectory: v.optional(v.string()),
    sessionCode: v.optional(v.string()), // Optional: if provided, link to existing code
  },
  handler: async (ctx, args) => {
    let sessionId: Id<"sessions">;
    const now = Date.now();

    if (args.sessionCode) {
      const existing = await ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("sessionCode", args.sessionCode!))
        .first();

      if (existing && existing.status === "active") {
        sessionId = existing._id;
        await ctx.db.patch(sessionId, {
          workingDirectory: args.workingDirectory,
          lastHeartbeat: now,
          status: "active",
        });
      } else {
        sessionId = await ctx.db.insert("sessions", {
          sessionCode: args.sessionCode,
          workingDirectory: args.workingDirectory,
          status: "active",
          lastHeartbeat: now,
          createdAt: now,
        });
      }
    } else {
      let code = generateRandomSessionCode();
      let existing = await ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("sessionCode", code))
        .first();
      while (existing) {
        code = generateRandomSessionCode();
        existing = await ctx.db
          .query("sessions")
          .withIndex("by_code", (q) => q.eq("sessionCode", code))
          .first();
      }

      sessionId = await ctx.db.insert("sessions", {
        sessionCode: code,
        workingDirectory: args.workingDirectory,
        status: "active",
        lastHeartbeat: now,
        createdAt: now,
      });
    }

    const session = await ctx.db.get(sessionId);
    return {
      sessionId,
      sessionCode: session!.sessionCode,
    };
  },
});

export const generateSessionCode = mutation({
  args: {},
  handler: async (ctx) => {
    let code = generateRandomSessionCode();
    let existing = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("sessionCode", code))
      .first();
    while (existing) {
      code = generateRandomSessionCode();
      existing = await ctx.db
        .query("sessions")
        .withIndex("by_code", (q) => q.eq("sessionCode", code))
        .first();
    }

    const sessionId = await ctx.db.insert("sessions", {
      sessionCode: code,
      status: "active",
      lastHeartbeat: Date.now(),
      createdAt: Date.now(),
    });

    return {
      sessionId,
      sessionCode: code,
    };
  },
});

export const getSessionByCode = query({
  args: { sessionCode: v.string() },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_code", (q) => q.eq("sessionCode", args.sessionCode))
      .first();

    if (!session) {
      return null;
    }

    const isActive =
      session.status === "active" &&
      Date.now() - session.lastHeartbeat < 30000;

    return {
      sessionId: session._id,
      sessionCode: session.sessionCode,
      status: isActive ? "active" : "inactive",
      lastHeartbeat: session.lastHeartbeat,
    };
  },
});

export const updateHeartbeat = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    await ctx.db.patch(args.sessionId, {
      lastHeartbeat: Date.now(),
      status: "active",
    });
  },
});

export const subscribeToolCalls = query({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx, args) => {
    const calls = await ctx.db
      .query("toolCalls")
      .withIndex("by_session_status", (q) =>
        q.eq("sessionId", args.sessionId).eq("status", "pending")
      )
      .order("asc")
      .collect();

    return calls;
  },
});

export const queueToolCall = internalMutation({
  args: {
    threadId: v.string(),
    sessionId: v.id("sessions"),
    toolName: v.string(),
    args: v.any(),
  },
  handler: async (ctx, args) => {
    const toolCallId = await ctx.db.insert("toolCalls", {
      threadId: args.threadId,
      sessionId: args.sessionId,
      toolName: args.toolName,
      args: args.args,
      status: "pending",
      createdAt: Date.now(),
    });

    return toolCallId;
  },
});

export const reportToolResult = mutation({
  args: {
    toolCallId: v.id("toolCalls"),
    result: v.any(),
    error: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const toolCall = await ctx.db.get(args.toolCallId);
    if (!toolCall) {
      throw new Error("Tool call not found");
    }

    if (toolCall.status !== "pending") {
      throw new Error("Tool call already processed");
    }

    await ctx.db.patch(args.toolCallId, {
      status: args.error ? "failed" : "completed",
      result: args.result,
      error: args.error,
      completedAt: Date.now(),
    });
  },
});

export const getToolCallResult = internalQuery({
  args: { toolCallId: v.id("toolCalls") },
  handler: async (ctx, args) => {
    const toolCall = await ctx.db.get(args.toolCallId);
    if (!toolCall) {
      return null;
    }

    return {
      status: toolCall.status,
      result: toolCall.result,
      error: toolCall.error,
    };
  },
});

export const getActiveSession = internalQuery({
  args: {},
  handler: async (ctx) => {
    const activeSessions = await ctx.db
      .query("sessions")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();

    const now = Date.now();
    const recentSessions = activeSessions.filter(
      (s) => now - s.lastHeartbeat < 30000
    );

    if (recentSessions.length === 0) {
      return null;
    }

    const mostRecent = recentSessions.reduce((latest, current) =>
      current.lastHeartbeat > latest.lastHeartbeat ? current : latest
    );

    return mostRecent._id;
  },
});

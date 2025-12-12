import { paginationOptsValidator } from "convex/server";
import { action, ActionCtx, mutation, MutationCtx, query, QueryCtx } from "../_generated/server";
import { components } from "../_generated/api";
import { createThread, getThreadMetadata, listMessages, saveMessage, vMessage } from "@convex-dev/agent";
import {v} from "convex/values";
import {agent} from "./initAgent";
import { z } from "zod";

export const listThreads = query({
    args : {
        paginationOpts: paginationOptsValidator,
    },
    handler : async (ctx, args) => {
        // const identity = await ctx.auth.getUserIdentity();
        // if (identity?.subject === null) {
        //     throw new Error("Not authenticated");
        // }
        const threads = await ctx.runQuery(
            components.agent.threads.listThreadsByUserId,
            { 
                //userId: identity?.subject, 
                paginationOpts: args.paginationOpts },
          );
          return threads;
    }
})

export const createNewThread = mutation({
    args: { title: v.optional(v.string()), initialMessage: v.optional(vMessage) },
    handler: async (ctx, { title, initialMessage }) => {
    //   const identity = await ctx.auth.getUserIdentity();
    //   if (identity?.subject === null) {
    //     throw new Error("Not authenticated");
    //   }
      
      const threadId = await createThread(ctx, components.agent, {
        //userId: identity?.subject,
        title,
      });
      if (initialMessage) {
        await saveMessage(ctx, components.agent, {
          threadId,
          message: initialMessage,
        });
      }
      return threadId;
    },
  });

  export const getThreadDetails = query({
    args: { threadId: v.string() },
    handler: async (ctx, { threadId }) => {
      await authorizeThreadAccess(ctx, threadId);
      const { title, summary } = await getThreadMetadata(ctx, components.agent, {
        threadId,
      });
      return { title, summary };
    },
  });


  export const updateThreadTitle = action({
    args: { threadId: v.string() },
    handler: async (ctx, { threadId }) => {
      await authorizeThreadAccess(ctx, threadId);
      const { thread } = await agent.continueThread(ctx, { threadId });
      const {
        object: { title, summary },
      } = await thread.generateObject(
        {
          model: "google/gemini-2.0-flash",
          schema: z.object({
            title: z.string().describe("The new title for the thread"),
            summary: z.string().describe("The new summary for the thread"),
          }),
          prompt: "Generate a title and summary for this thread in 3-4 words.",
        },
        { storageOptions: { saveMessages: "none" } },
      );
      await thread.updateMetadata({ title, summary });
    },
  });


  export const deleteThread = mutation({
    args: { threadId: v.string() },
    handler: async (ctx, { threadId }) => {
      await authorizeThreadAccess(ctx, threadId, true);
      await ctx.runMutation(components.agent.threads.deleteAllForThreadIdAsync, { threadId });
      return true;
    },
  })  

  
  export const forkThread = mutation({
    args: { threadId: v.string() },
    handler: async (ctx, { threadId }) => {
     // await authorizeThreadAccess(ctx, threadId, true);
      const threadDetails = await getThreadMetadata(ctx, components.agent, { threadId });
      
      // Fetch all messages from the original thread
      const allMessages: Array<{ message?: any }> = [];
      let cursor: string | null = null;
      let isDone = false;
      
      while (!isDone) {
        const result = await listMessages(ctx, components.agent, {
          threadId,
          paginationOpts: { numItems: 1000, cursor },
        });
        
        allMessages.push(...result.page);
        cursor = result.continueCursor;
        isDone = result.isDone;
      }
      
      // Reverse to get chronological order (listMessages returns newest first)
      allMessages.reverse();
      
      // Create the new thread
      const newThreadId = await createThread(ctx, components.agent, {
        userId: threadDetails.userId,
        title: threadDetails.title,
      });
      
      // Copy all messages to the new thread
      for (const msg of allMessages) {
        if (msg.message) {
          await saveMessage(ctx, components.agent, {
            threadId: newThreadId,
            message: msg.message,
          });
        }
      }
      
      return newThreadId;
    },
  });

  
  export async function authorizeThreadAccess(
    ctx: QueryCtx | MutationCtx | ActionCtx,
    threadId: string,
    requireUser?: boolean,
  ) {
    // const identity = await ctx.auth.getUserIdentity();
    // if (requireUser && !identity?.subject) {
    //   throw new Error("Unauthorized: user is required");
    // }
    const { userId: threadUserId } = await getThreadMetadata(
      ctx,
      components.agent,
      { threadId },
    );
    // if (requireUser && threadUserId !== identity?.subject) {
    //   throw new Error("Unauthorized: user does not match thread user");
    // }
  }


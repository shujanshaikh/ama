import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { internalAction } from "../_generated/server";
import { components, internal } from "../_generated/api";
import {  amaAgent } from "./initAgent";
import { authorizeThreadAccess } from "./thread";
import { abortStream, listUIMessages, syncStreams, vStreamArgs } from "@convex-dev/agent";
import { paginationOptsValidator } from "convex/server";



export const initiateAsyncStreaming = mutation({
    args: { prompt: v.string(), threadId: v.string() , model: v.string() , urls: v.optional(v.array(v.string())) , webSearch: v.boolean() },
    
    handler: async (ctx, { prompt, threadId, model, urls, webSearch }) => {
      await authorizeThreadAccess(ctx, threadId);
      const content: Array<{ type: "image"; image: string; mimeType: string } | { type: "text"; text: string }> = [];
      
      // Add all image parts
      if (urls && urls.length > 0) {
        urls.forEach((url) => {
          content.push({ type: "image", image: url, mimeType: "image/png" });
        });
      }
      
      // Add text part
      content.push({ type: "text", text: prompt });
      
      const { messageId } = await amaAgent(model).saveMessage(ctx, {
        threadId,
        //prompt,
        skipEmbeddings: true,
        message: {
          role: "user",
          content: content,
        },
      });
      await ctx.scheduler.runAfter(0, internal.agent.chatStreaming.streamAsync, {
        threadId,
        promptMessageId: messageId,
        model,
        webSearch,
      });
    },
  });
  
  export const streamAsync = internalAction({
    args: { promptMessageId: v.string(), threadId: v.string(), model: v.string() , webSearch: v.boolean() },
    handler: async (ctx, { promptMessageId, threadId, model, webSearch }) => {
      const result = await amaAgent(model).streamText(
        ctx,
        { threadId },
        { promptMessageId },
        { saveStreamDeltas: { chunking: "word", throttleMs: 100 } },
        
      );
      await result.consumeStream();
    },
  });


  export const listThreadMessages = query({
    args: {
      threadId: v.string(),
      paginationOpts: paginationOptsValidator,
      streamArgs: vStreamArgs,
    },
    handler: async (ctx, args) => {
      const { threadId, streamArgs } = args;
      await authorizeThreadAccess(ctx, threadId);
      const streams = await syncStreams(ctx, components.agent, {
        threadId,
        streamArgs,
      });
    
  
      const paginated = await listUIMessages(ctx, components.agent, args);

  
      return {
        ...paginated,
        streams,
      };
    },
  });

  export const abortStreamByOrder = mutation({
    args: { threadId: v.string(), order: v.number() },
    handler: async (ctx, { threadId, order }) => {
      await authorizeThreadAccess(ctx, threadId);
      if (
        await abortStream(ctx, components.agent, {
          threadId,
          order,
          reason: "Aborting explicitly",
        })
      ) {
        console.log("Aborted stream", threadId, order);
      } else {
        console.log("No stream found", threadId, order);
      }
    },
  });
  
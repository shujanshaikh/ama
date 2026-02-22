import { tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";
import type { ToolExecutionContext } from "@/lib/executeTool";

const exaCache = new Map<string, Exa>();

function getExa(apiKey: string): Exa {
  let exa = exaCache.get(apiKey);
  if (!exa) {
    exa = new Exa(apiKey);
    exaCache.set(apiKey, exa);
  }
  return exa;
}

export function createWebSearchTool(context: ToolExecutionContext) {
  return tool({
    description: "Search the web for up-to-date information.",
    inputSchema: z.object({
      query: z.string(),
      numResults: z.number().optional(),
    }),
    execute: async ({ query, numResults }) => {
      const apiKey = context.env.EXA_API_KEY;
      if (!apiKey) {
        return {
          success: false,
          message: "EXA_API_KEY is not configured",
          error: "WEB_SEARCH_ERROR",
        };
      }

      const exa = getExa(apiKey);
      return exa.searchAndContents(query, {
        type: "auto",
        category: "research paper",
        numResults: numResults ?? 5,
        moderation: true,
        contents: {
          text: true,
          summary: {
            query,
          },
          subpages: 1,
          subpageTarget: "sources",
          extras: {
            links: 1,
            imageLinks: 1,
          },
        },
      });
    },
  });
}

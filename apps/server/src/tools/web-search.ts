import { tool } from "ai";
import { z } from "zod"
import Exa from 'exa-js';


const exa = new Exa(process.env.EXA_API_KEY);

export const webSearch = tool({
  description: "Search the web for up-to-date information, documentation, package details, API references, and current best practices. Use this tool when you need information that may not be in your training data or when you need to verify the latest version of a package, recent API changes, or official documentation. Returns search results with content summaries, links, and relevant context.",
  inputSchema: z.object({
    query: z.string().describe("The search query string. Be specific and include relevant keywords, package names, or technical terms."),
    numResults: z.number().describe("The number of search results to return (default: 5). Optional.").optional(),
    }),
  execute: async ({ query, numResults }) => {
    try {
      const results = await exa.searchAndContents(query, {
        type: 'auto',
        category: 'research paper',
        numResults: numResults ?? 5,
        moderation: true,
        contents: {
            text: true,
            summary: {
                query: query
            },
            subpages: 1,
            subpageTarget: 'sources',
            extras: {
                links: 1,
                imageLinks: 1
            }
        }
    });
    return results;
    } catch (error: any) {
      console.error(`Error searching: ${error}`);
      return {
        success: false,
        message: `Failed to search: ${error.message || error}`,
        error: 'WEB_SEARCH_ERROR',
      };
    }

  }
})

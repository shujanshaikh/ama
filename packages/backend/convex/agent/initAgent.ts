import { components } from "../_generated/api";
import { Agent, stepCountIs } from "@convex-dev/agent";
import { defaultConfig } from "./config";
import { tools } from "./tools/tools";
import { SYSTEM_PROMPT } from "./lib/prompt";


export const agent = new Agent(components.agent, {
    name: "ama",
   // instructions: "Youre",
    ...defaultConfig,
  });


  export function amaAgent(
    model: string,
  ) {
    return new Agent(components.agent, {
      name: "ama",
      languageModel: model,
    //     usageHandler: async (ctx, args) => {
    //     // const { usage, model, provider, agentName, threadId, userId } = args;
    //         await usageHandler(ctx, args);
    //   },
      textEmbeddingModel: "google/text-multilingual-embedding-002",
      instructions: SYSTEM_PROMPT,
      tools: tools,
      stopWhen:[stepCountIs(20)], // stop after 3 steps
    });
  }
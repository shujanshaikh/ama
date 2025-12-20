import { publicProcedure, router } from "../index";
import { projectRouter } from "./project";
import { chatRouter } from "./chat";
import { generateTitleRouter } from "./generateTitle";

export const appRouter = router({
  healthCheck: publicProcedure.query(() => {
    return "OK";
  }),
  project: projectRouter,
  chat: chatRouter,
  generateTitle: generateTitleRouter,
});
export type AppRouter = typeof appRouter;

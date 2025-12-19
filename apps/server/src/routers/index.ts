import { router, publicProcedure } from "./trpc";
import { authRouter } from "./auth";
import { projectRouter } from "./project";
import { chatRouter } from "./chat";
import { generateTitleRouter } from "./generateTitle";

export const appRouter = router({
	hello: publicProcedure
		.query(() => {
			return {
				greeting: `Hello ama from trpc!`,
			};
		}),
	auth: authRouter,
	project: projectRouter,
	chat: chatRouter,
	generateTitle: generateTitleRouter,
});

export type AppRouter = typeof appRouter;

import { router, publicProcedure } from "./trpc";
import { authRouter } from "./auth";
import { projectRouter } from "./project";
import { chatRouter } from "./chat";

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
});

export type AppRouter = typeof appRouter;

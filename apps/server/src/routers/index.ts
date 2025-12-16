import { router, publicProcedure } from "./trpc";
import { authRouter } from "./auth";

export const appRouter = router({
	hello: publicProcedure
		.query(() => {
			return {
				greeting: `Hello ama from trpc!`,
			};
		}),
	auth: authRouter,
});

export type AppRouter = typeof appRouter;

import { router, publicProcedure } from "./trpc";

export const appRouter = router({
	hello: publicProcedure
		.query(() => {
			return {
				greeting: `Hello ama from trpc!`,
			};
		}),
});

export type AppRouter = typeof appRouter;

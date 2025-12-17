import { initTRPC, TRPCError } from "@trpc/server";
import { workos, cookiePassword } from "../lib/workos";
import type { AuthenticateWithSessionCookieSuccessResponse } from "@workos-inc/node";

export interface TRPCContext {
    sessionCookie?: string;
    userId?: string;
}

export const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;

export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
    if (!ctx.sessionCookie) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
    }

    try {
        const session = workos.userManagement.loadSealedSession({
            sessionData: ctx.sessionCookie,
            cookiePassword: cookiePassword,
        });

        const authResult = await session.authenticate();

        if (authResult.authenticated) {
            const { user } = authResult as AuthenticateWithSessionCookieSuccessResponse;
            return next({ 
                ctx: { 
                    ...ctx, 
                    userId: user.id 
                } 
            });
        }
        try {
            const refreshResult = await session.refresh();
            if (refreshResult.authenticated) {
                const { user } = refreshResult as AuthenticateWithSessionCookieSuccessResponse;
                return next({ 
                    ctx: { 
                        ...ctx, 
                        userId: user.id 
                    } 
                });
            }
        } catch {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired" });
        }

        throw new TRPCError({ code: "UNAUTHORIZED", message: "Session expired" });
    } catch (error) {
        if (error instanceof TRPCError) {
            throw error;
        }
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid session" });
    }
});

export const createCallerFactory = t.createCallerFactory;
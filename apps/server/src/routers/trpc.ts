import { initTRPC } from "@trpc/server";


export interface TRPCContext {
    sessionCookie?: string;
}

export const t = initTRPC.context<TRPCContext>().create();

export const router = t.router;

export const publicProcedure = t.procedure;

export const createCallerFactory = t.createCallerFactory;
import { db } from "@/db";
import { protectedProcedure, router } from "./trpc";
import { z } from "zod";
import { project } from "@/db/schema";
import { eq } from "drizzle-orm";

export const projectRouter = router({
    createProject: protectedProcedure.input(z.object({
        name: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const { name } = input;
        const newProject = await db.insert(project).values({
            name,
            userId: ctx.userId,
        });
        return newProject;
    }),

    getProjects: protectedProcedure.query(async ({ ctx }) => {
        const projects = await db.select().from(project).where(eq(project.userId, ctx.userId));
        return { data: projects };
    }),
});
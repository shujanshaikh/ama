import { db, project } from "@ama/db";
import { protectedProcedure, router } from "../index";
import { z } from "zod";
import { eq } from "drizzle-orm";

export const projectRouter = router({
    createProject: protectedProcedure.input(z.object({
        name: z.string(),
        cwd: z.string(),
        gitRepo: z.string(),
    })).mutation(async ({ ctx, input }) => {
        const { name, cwd, gitRepo } = input;
        const [newProject] = await db.insert(project).values({
            name,
            userId: ctx.session.user?.id!,
            cwd,
            gitRepo,
        }).returning();
        return newProject;
    }),

    getProjects: protectedProcedure.query(async ({ ctx }) => {
        const projects = await db.select().from(project).where(eq(project.userId, ctx.session.user?.id!));
        return projects;
    }),

    getProject: protectedProcedure.input(z.object({
        projectId: z.string(),
    })).query(async ({ input }) => {
        const projectData = await db.select().from(project).where(eq(project.id, input.projectId));
        if (projectData.length === 0) {
            throw new Error("Project not found");
        }
        return projectData[0];
    }),
});
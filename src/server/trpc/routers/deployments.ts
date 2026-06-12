import { TRPCError } from "@trpc/server";
import { desc, eq } from "drizzle-orm";
import { customAlphabet } from "nanoid";
import { z } from "zod";
import { deploymentUrl } from "../../config";
import { runDeployment, teardownDeployment } from "../../deployments/runner";
import { db } from "../../db";
import { deployments } from "../../db/schema";
import { protectedProcedure, router } from "../trpc";

const slugId = customAlphabet("abcdefghijklmnopqrstuvwxyz0123456789", 6);

const labelSchema = z.record(z.string().min(1), z.string());

const createInput = z.object({
  name: z.string().min(1).max(80),
  repoUrl: z.string().url(),
  dockerfilePath: z.string().min(1).default("Dockerfile"),
  exposedPort: z.number().int().min(1).max(65535),
  customLabels: labelSchema.optional(),
});

export const deploymentsRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const rows = ctx.authEnabled
      ? await db
          .select()
          .from(deployments)
          .where(eq(deployments.userId, ctx.userId!))
          .orderBy(desc(deployments.createdAt))
      : await db.select().from(deployments).orderBy(desc(deployments.createdAt));

    return rows.map((row) => ({
      ...row,
      url: deploymentUrl(row.slug),
    }));
  }),

  create: protectedProcedure.input(createInput).mutation(async ({ ctx, input }) => {
    const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${slugId()}`;
    const now = new Date();

    const [created] = await db
      .insert(deployments)
      .values({
        id: slugId(),
        userId: ctx.authEnabled ? ctx.userId : null,
        name: input.name,
        slug,
        repoUrl: input.repoUrl,
        dockerfilePath: input.dockerfilePath,
        exposedPort: input.exposedPort,
        customLabels: input.customLabels ?? {},
        status: "pending",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Fire and forget — client watches status + logs
    void runDeployment(created.id).catch(() => undefined);

    return {
      ...created,
      url: deploymentUrl(created.slug),
    };
  }),

  redeploy: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const row = await findOwnedDeployment(input.id, ctx.userId, ctx.authEnabled);
      void runDeployment(row.id, true).catch(() => undefined);
      return { ok: true };
    }),

  remove: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await findOwnedDeployment(input.id, ctx.userId, ctx.authEnabled);
      await teardownDeployment(input.id);
      return { ok: true };
    }),

  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const row = await findOwnedDeployment(input.id, ctx.userId, ctx.authEnabled);
      return { ...row, url: deploymentUrl(row.slug) };
    }),
});

async function findOwnedDeployment(id: string, userId: string | undefined, authEnabled: boolean) {
  const [row] = await db.select().from(deployments).where(eq(deployments.id, id));
  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND" });
  }
  if (authEnabled && row.userId !== userId) {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return row;
}

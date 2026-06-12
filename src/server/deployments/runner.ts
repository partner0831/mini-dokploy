import { eq } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { config } from "../config";
import { db } from "../db";
import { deployments } from "../db/schema";
import { ensureDocker } from "../docker/client";
import { buildImage, cloneRepo } from "../docker/build";
import { createAppService, removeAppService, updateAppService } from "../docker/services";
import { publish } from "../logs/hub";

const activeJobs = new Set<string>();

function log(deploymentId: string, line: string) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  publish(deploymentId, stamped);
}

async function setStatus(
  deploymentId: string,
  status: (typeof deployments.$inferSelect)["status"],
  extra?: Partial<typeof deployments.$inferInsert>,
) {
  await db
    .update(deployments)
    .set({ status, updatedAt: new Date(), ...extra })
    .where(eq(deployments.id, deploymentId));
}

export async function runDeployment(deploymentId: string, redeploy = false) {
  if (activeJobs.has(deploymentId)) {
    throw new Error("Deployment is already in progress");
  }

  activeJobs.add(deploymentId);

  try {
    const [row] = await db.select().from(deployments).where(eq(deployments.id, deploymentId));
    if (!row) throw new Error("Deployment not found");

    const buildDir = path.join(config.buildsDir, row.id);
    const imageTag = `minidokploy/${row.slug}:latest`;
    const serviceName = row.serviceName ?? `app-${row.slug}`;

    await setStatus(deploymentId, "building", { errorMessage: null });
    await ensureDocker();

    if (redeploy && row.serviceName) {
      log(deploymentId, "Tearing down previous service...");
      await removeAppService(row.serviceName).catch((err) => {
        log(deploymentId, `Could not remove old service: ${err.message}`);
      });
    }

    await cloneRepo(row.repoUrl, buildDir, (line) => log(deploymentId, line));
    await buildImage({
      contextDir: buildDir,
      dockerfilePath: row.dockerfilePath,
      imageTag,
      onLog: (line) => log(deploymentId, line),
    });

    await setStatus(deploymentId, "deploying", { imageTag, serviceName });

    const labels = (row.customLabels ?? {}) as Record<string, string>;

    if (redeploy) {
      await updateAppService({
        serviceName,
        imageTag,
        slug: row.slug,
        exposedPort: row.exposedPort,
        customLabels: labels,
        onLog: (line) => log(deploymentId, line),
      });
    } else {
      await createAppService({
        serviceName,
        imageTag,
        slug: row.slug,
        exposedPort: row.exposedPort,
        customLabels: labels,
        onLog: (line) => log(deploymentId, line),
      });
    }

    await setStatus(deploymentId, "running", { imageTag, serviceName });
    log(deploymentId, `Live at ${row.slug}.${config.baseDomain}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    log(deploymentId, `Failed: ${message}`);
    await setStatus(deploymentId, "failed", { errorMessage: message });
    throw err;
  } finally {
    activeJobs.delete(deploymentId);
  }
}

export async function teardownDeployment(deploymentId: string) {
  const [row] = await db.select().from(deployments).where(eq(deployments.id, deploymentId));
  if (!row) return;

  if (row.serviceName) {
    await removeAppService(row.serviceName);
  }

  const buildDir = path.join(config.buildsDir, row.id);
  if (fs.existsSync(buildDir)) {
    fs.rmSync(buildDir, { recursive: true, force: true });
  }

  await db.delete(deployments).where(eq(deployments.id, deploymentId));
}

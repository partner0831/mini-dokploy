import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import { ensureDocker, getDocker } from "./client";

const execFileAsync = promisify(execFile);

function listContextFiles(dir: string, root = dir): string[] {
  const files: string[] = [];

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git") continue;

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listContextFiles(fullPath, root));
      continue;
    }

    files.push(path.relative(root, fullPath).replace(/\\/g, "/"));
  }

  return files;
}

export async function cloneRepo(repoUrl: string, targetDir: string, onLog?: (line: string) => void) {
  if (fs.existsSync(targetDir)) {
    fs.rmSync(targetDir, { recursive: true, force: true });
  }
  fs.mkdirSync(targetDir, { recursive: true });

  onLog?.(`Cloning ${repoUrl}...`);
  const { stdout, stderr } = await execFileAsync("git", ["clone", "--depth", "1", repoUrl, targetDir], {
    maxBuffer: 10 * 1024 * 1024,
  });

  if (stdout) onLog?.(stdout.trim());
  if (stderr) onLog?.(stderr.trim());
}

export async function buildImage(opts: {
  contextDir: string;
  dockerfilePath: string;
  imageTag: string;
  onLog?: (line: string) => void;
}) {
  const dockerfile = path.join(opts.contextDir, opts.dockerfilePath);

  if (!fs.existsSync(dockerfile)) {
    throw new Error(`Dockerfile not found at ${opts.dockerfilePath}`);
  }

  await ensureDocker();

  const docker = getDocker();
  const dockerfilePosix = opts.dockerfilePath.replace(/\\/g, "/");

  opts.onLog?.(`Building image ${opts.imageTag}...`);

  const stream = await docker.buildImage(
    {
      context: opts.contextDir,
      src: listContextFiles(opts.contextDir),
    },
    {
      t: opts.imageTag,
      dockerfile: dockerfilePosix,
    },
  );

  await new Promise<void>((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, output) => {
        if (err) return reject(err);
        const failed = output?.find((chunk) => chunk.error);
        if (failed?.error) return reject(new Error(failed.error));
        resolve();
      },
      (event) => {
        if (event.stream) opts.onLog?.(event.stream.trimEnd());
        if (event.status) {
          const detail = event.progress ? ` ${event.progress}` : "";
          opts.onLog?.(`${event.status}${detail}`);
        }
        if (event.error) opts.onLog?.(`ERROR: ${event.error}`);
      },
    );
  });

  opts.onLog?.(`Image ${opts.imageTag} built successfully.`);
}

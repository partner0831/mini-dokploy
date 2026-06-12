import Docker from "dockerode";

let docker: Docker | null = null;

function socketPath() {
  if (process.env.DOCKER_SOCKET) return process.env.DOCKER_SOCKET;
  if (process.platform === "win32") return "//./pipe/docker_engine";
  return "/var/run/docker.sock";
}

export function getDocker() {
  if (!docker) {
    docker = new Docker({ socketPath: socketPath() });
  }
  return docker;
}

export async function ensureDocker() {
  try {
    await getDocker().ping();
  } catch {
    throw new Error(
      "Cannot reach the Docker daemon. Start Docker Desktop, then try again.",
    );
  }
}

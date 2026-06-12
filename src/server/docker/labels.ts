import { config } from "../config";

export function traefikLabels(opts: {
  slug: string;
  exposedPort: number;
  customLabels?: Record<string, string>;
}) {
  const router = `app-${opts.slug}`;
  const service = `app-${opts.slug}`;

  const labels: Record<string, string> = {
    "traefik.enable": "true",
    [`traefik.http.routers.${router}.rule`]: `Host(\`${opts.slug}.${config.baseDomain}\`)`,
    [`traefik.http.routers.${router}.entrypoints`]: "web",
    [`traefik.http.services.${service}.loadbalancer.server.port`]: String(opts.exposedPort),
  };

  return { ...labels, ...(opts.customLabels ?? {}) };
}

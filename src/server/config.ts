export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  baseDomain: process.env.BASE_DOMAIN ?? "127.0.0.1.sslip.io",
  traefikNetwork: process.env.TRAEFIK_NETWORK ?? "minidokploy_traefik-public",
  stackName: process.env.STACK_NAME ?? "minidokploy",
  buildsDir: process.env.BUILDS_DIR ?? "./builds",
  authEnabled: process.env.AUTH_ENABLED !== "false",
  publicUrl: process.env.PUBLIC_URL ?? "http://minidokploy.127.0.0.1.sslip.io",
};

export function deploymentUrl(slug: string) {
  return `http://${slug}.${config.baseDomain}`;
}

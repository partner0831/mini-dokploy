import { config } from "../config";
import { getDocker } from "./client";
import { traefikLabels } from "./labels";

async function traefikNetworkTarget() {
  const docker = getDocker();
  const networks = await docker.listNetworks({
    filters: { name: [config.traefikNetwork] },
  });

  const match = networks.find((net) => net.Name === config.traefikNetwork);
  if (!match?.Id) {
    throw new Error(
      `Overlay network "${config.traefikNetwork}" not found. Run the stack first.`,
    );
  }

  return match.Id;
}

export async function createAppService(opts: {
  serviceName: string;
  imageTag: string;
  slug: string;
  exposedPort: number;
  customLabels?: Record<string, string>;
  onLog?: (line: string) => void;
}) {
  const docker = getDocker();
  const networkId = await traefikNetworkTarget();
  const labels = traefikLabels({
    slug: opts.slug,
    exposedPort: opts.exposedPort,
    customLabels: opts.customLabels,
  });

  opts.onLog?.(`Creating swarm service ${opts.serviceName}...`);

  const service = await docker.createService({
    Name: opts.serviceName,
    Labels: labels,
    TaskTemplate: {
      ContainerSpec: {
        Image: opts.imageTag,
        Labels: labels,
      },
      Networks: [{ Target: networkId }],
      RestartPolicy: { Condition: "any" },
    },
    Mode: { Replicated: { Replicas: 1 } },
    EndpointSpec: {
      Mode: "vip",
    },
  });

  opts.onLog?.(`Service ${opts.serviceName} is up.`);
  return service;
}

export async function removeAppService(serviceName: string) {
  const docker = getDocker();
  const services = await docker.listServices({ filters: { name: [serviceName] } });
  const match = services.find((s) => s.Spec?.Name === serviceName);
  if (!match?.ID) return;
  const service = docker.getService(match.ID);
  await service.remove();
}

export async function updateAppService(opts: {
  serviceName: string;
  imageTag: string;
  slug: string;
  exposedPort: number;
  customLabels?: Record<string, string>;
  onLog?: (line: string) => void;
}) {
  const docker = getDocker();
  const services = await docker.listServices({ filters: { name: [opts.serviceName] } });
  const match = services.find((s) => s.Spec?.Name === opts.serviceName);

  if (!match?.ID) {
    return createAppService(opts);
  }

  const labels = traefikLabels({
    slug: opts.slug,
    exposedPort: opts.exposedPort,
    customLabels: opts.customLabels,
  });

  opts.onLog?.(`Updating service ${opts.serviceName} to ${opts.imageTag}...`);

  const service = docker.getService(match.ID);
  const inspection = await service.inspect();
  const spec = inspection.Spec;
  if (!spec?.TaskTemplate?.ContainerSpec) {
    throw new Error("Service spec is missing container details");
  }

  await service.update({
    version: inspection.Version.Index,
    ...spec,
    Labels: labels,
    TaskTemplate: {
      ...spec.TaskTemplate,
      ContainerSpec: {
        ...spec.TaskTemplate.ContainerSpec,
        Image: opts.imageTag,
        Labels: labels,
      },
    },
  });

  opts.onLog?.(`Service ${opts.serviceName} updated.`);
}

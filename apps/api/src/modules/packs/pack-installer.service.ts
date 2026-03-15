import { isInstallableManifest } from "@birthub/agents-core";
import { Prisma, prisma } from "@birthub/database";

import { toPrismaJsonValue } from "../../lib/prisma-json.js";
import { encryptConnectorsMap } from "../../lib/encryption.js";
import { getAgentLimitForOrganization, LimitExceededError } from "../billing/index.js";
import { marketplaceService } from "../marketplace/marketplace-service.js";

interface InstallPackInput {
  activateAgents: boolean;
  agentId?: string;
  actorId: string;
  connectors: Record<string, unknown>;
  packId?: string;
  tenantId: string;
}

function requireActorId(actorId: string | null | undefined, action: string): string {
  const value = actorId?.trim();

  if (!value) {
    throw new Error(`ACTOR_ID_REQUIRED:${action}`);
  }

  return value;
}

function extractPackId(config: unknown): string | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  const value = (config as { packId?: unknown }).packId;
  return typeof value === "string" ? value : null;
}

function extractVersion(config: unknown, field: "installedVersion" | "latestAvailableVersion"): string | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  const value = (config as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

function extractSourceAgentId(config: unknown): string | null {
  if (!config || typeof config !== "object") {
    return null;
  }

  const value = (config as { sourceAgentId?: unknown }).sourceAgentId;
  return typeof value === "string" ? value : null;
}

function resolveRequestedAgentId(input: InstallPackInput): string {
  const candidate = input.agentId?.trim() || input.packId?.trim();

  if (!candidate) {
    throw new Error("agentId or packId is required to install an official agent.");
  }

  return candidate;
}

export class PackInstallerService {
  async installPackAtomic(input: InstallPackInput) {
    const actorId = requireActorId(input.actorId, "install-pack");
    const catalog = await marketplaceService.getCatalog();
    const requestedAgentId = resolveRequestedAgentId(input);
    const selectedEntry = catalog.find(
      (entry) => entry.manifest.agent.id === requestedAgentId && isInstallableManifest(entry.manifest)
    );

    if (!selectedEntry) {
      throw new Error(`Installable agent '${requestedAgentId}' was not found in catalog.`);
    }

    const organization = await prisma.organization.findUnique({
      where: {
        tenantId: input.tenantId
      }
    });

    if (!organization) {
      throw new Error(`Tenant ${input.tenantId} does not exist.`);
    }

    const currentAgentCount = await prisma.agent.count({
      where: {
        tenantId: input.tenantId
      }
    });
    const tenantAgents = await prisma.agent.findMany({
      where: {
        tenantId: input.tenantId
      }
    });
    const existingAgent = tenantAgents.find(
      (agent) => extractSourceAgentId(agent.config) === requestedAgentId
    ) ?? null;
    const alreadyInstalled =
      existingAgent !== null && extractSourceAgentId(existingAgent.config) === requestedAgentId;
    const agentLimit = await getAgentLimitForOrganization(input.tenantId);

    if (
      Number.isFinite(agentLimit) &&
      currentAgentCount + (alreadyInstalled ? 0 : 1) > agentLimit
    ) {
      throw new LimitExceededError({
        current: currentAgentCount,
        limit: agentLimit,
        resource: "agents"
      });
    }

    let installedAgentId: string | null = existingAgent?.id ?? null;

    await prisma.$transaction(async (tx) => {
      if (existingAgent && extractSourceAgentId(existingAgent.config) === requestedAgentId) {
        const currentConfig = existingAgent.config && typeof existingAgent.config === "object" ? existingAgent.config : {};

        await tx.agent.update({
          data: {
            config: toPrismaJsonValue({
              ...(currentConfig as Record<string, unknown>),
              connectors: encryptConnectorsMap(input.connectors),
              latestAvailableVersion: selectedEntry.manifest.agent.version,
              packId: requestedAgentId,
              sourceAgentId: selectedEntry.manifest.agent.id,
              status: input.activateAgents ? "active" : "installed"
            }) as Prisma.InputJsonObject,
            status: input.activateAgents ? "ACTIVE" : "PAUSED"
          },
          where: {
            id: existingAgent.id
          }
        });
      } else {
        const createdAgent = await tx.agent.create({
          data: {
            config: toPrismaJsonValue({
              connectors: encryptConnectorsMap(input.connectors),
              installedAt: new Date().toISOString(),
              installedVersion: selectedEntry.manifest.agent.version,
              latestAvailableVersion: selectedEntry.manifest.agent.version,
              packId: requestedAgentId,
              sourceAgentId: selectedEntry.manifest.agent.id,
              status: input.activateAgents ? "active" : "installed"
            }) as Prisma.InputJsonObject,
            name: selectedEntry.manifest.agent.name,
            organizationId: organization.id,
            status: input.activateAgents ? "ACTIVE" : "PAUSED",
            tenantId: input.tenantId
          }
        });

        installedAgentId = createdAgent.id;
      }

      await tx.auditLog.create({
        data: {
          action: "PACK_INSTALL",
          actorId,
          diff: toPrismaJsonValue({
            activateAgents: input.activateAgents,
            agentId: requestedAgentId,
            alreadyInstalled,
            connectors: input.connectors,
            packId: requestedAgentId
          }),
          entityId: requestedAgentId,
          entityType: "agent_pack",
          tenantId: input.tenantId
        }
      });
    });

    return {
      agentId: requestedAgentId,
      alreadyInstalled,
      installedAgentId,
      installedAgents: alreadyInstalled ? 0 : 1,
      packId: requestedAgentId
    };
  }

  async uninstallPackAtomic(input: { actorId: string; packId: string; tenantId: string }) {
    const actorId = requireActorId(input.actorId, "uninstall-pack");
    const agents = await prisma.agent.findMany({
      where: {
        tenantId: input.tenantId
      }
    });

    const idsToDelete = agents
      .filter((agent) => extractPackId(agent.config) === input.packId)
      .map((agent) => agent.id);

    if (idsToDelete.length > 0) {
      // Find active workflows using any of the agents from this pack
      const dependentSteps = await prisma.workflowStep.findMany({
        where: {
          tenantId: input.tenantId,
          type: "AGENT_EXECUTE",
          workflow: {
            status: { in: ["PUBLISHED", "DRAFT"] }
          }
        },
        include: {
          workflow: true
        }
      });

      const activeWorkflowDependencies = dependentSteps.filter((step) => {
        const config = step.config as { agentId?: string } | null;
        return config?.agentId && idsToDelete.includes(config.agentId);
      });

      if (activeWorkflowDependencies.length > 0) {
        // Find workflow names to provide a better error message
        const workflowNames = Array.from(new Set(activeWorkflowDependencies.map(s => s.workflow.name)));

        // The requirement is to NOT simply delete the pack and cause crashes.
        // We throw an explicit error allowing the user to know which workflows are blocking uninstallation.
        throw new Error(
          `Cannot uninstall pack because it is being used by active workflows: ${workflowNames.join(", ")}. Please remove the agents from these workflows or archive them first.`
        );
      }
    }

    await prisma.$transaction(async (tx) => {
      if (idsToDelete.length > 0) {
        await tx.agent.deleteMany({
          where: {
            id: {
              in: idsToDelete
            }
          }
        });
      }

      await tx.auditLog.create({
        data: {
          action: "PACK_UNINSTALL",
          actorId,
          diff: toPrismaJsonValue({
            deletedAgents: idsToDelete.length,
            packId: input.packId
          }),
          entityId: input.packId,
          entityType: "agent_pack",
          tenantId: input.tenantId
        }
      });
    });

    return {
      deletedAgents: idsToDelete.length,
      packId: input.packId
    };
  }

  async getPackStatus(tenantId: string) {
    const agents = await prisma.agent.findMany({
      where: {
        tenantId
      }
    });

    const grouped = new Map<
      string,
      {
        installedVersion: string;
        latestAvailableVersion: string;
        packId: string;
        status: "active" | "degraded" | "failed" | "installed";
      }
    >();

    for (const agent of agents) {
      const packId = extractPackId(agent.config);

      if (!packId) {
        continue;
      }

      const installedVersion = extractVersion(agent.config, "installedVersion") ?? "1.0.0";
      const latestAvailableVersion = extractVersion(agent.config, "latestAvailableVersion") ?? installedVersion;
      const status =
        agent.status === "ACTIVE"
          ? "active"
          : agent.status === "PAUSED"
            ? "installed"
            : "failed";

      if (!grouped.has(packId)) {
        grouped.set(packId, {
          installedVersion,
          latestAvailableVersion,
          packId,
          status
        });
      }
    }

    return [...grouped.values()];
  }

  async updatePackVersion(input: {
    actorId: string;
    latestAvailableVersion: string;
    packId: string;
    tenantId: string;
  }) {
    const actorId = requireActorId(input.actorId, "update-pack-version");
    const agents = await prisma.agent.findMany({
      where: {
        tenantId: input.tenantId
      }
    });

    const idsToUpdate = agents
      .filter((agent) => extractPackId(agent.config) === input.packId)
      .map((agent) => agent.id);

    await prisma.$transaction(async (tx) => {
      for (const id of idsToUpdate) {
        const current = await tx.agent.findUnique({ where: { id } });

        if (!current) {
          continue;
        }

        const currentConfig = current.config && typeof current.config === "object" ? current.config : {};

        await tx.agent.update({
          data: {
            config: toPrismaJsonValue({
              ...(currentConfig as Record<string, unknown>),
              latestAvailableVersion: input.latestAvailableVersion
            }) as Prisma.InputJsonObject
          },
          where: { id }
        });
      }

      await tx.auditLog.create({
        data: {
          action: "PACK_VERSION_UPDATED",
          actorId,
          diff: toPrismaJsonValue({
            affectedAgents: idsToUpdate.length,
            latestAvailableVersion: input.latestAvailableVersion,
            packId: input.packId
          }),
          entityId: input.packId,
          entityType: "agent_pack",
          tenantId: input.tenantId
        }
      });
    });

    return {
      affectedAgents: idsToUpdate.length,
      latestAvailableVersion: input.latestAvailableVersion,
      packId: input.packId
    };
  }
}

export const packInstallerService = new PackInstallerService();

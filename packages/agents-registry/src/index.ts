import { createHash } from "node:crypto";

import semver from "semver";

export type AgentVersionStatus = "DEPRECATED" | "DRAFT" | "PUBLISHED";

export interface AgentRecord {
  id: string;
  tenantId: string;
  name: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentVersionRecord {
  id: string;
  agentId: string;
  version: string;
  status: AgentVersionStatus;
  manifest: Record<string, unknown>;
  manifestDigest: string;
  changelog?: string;
  createdAt: Date;
  publishedAt?: Date;
}

export interface CreateAgentVersionInput {
  agentId: string;
  tenantId: string;
  name: string;
  tags?: string[];
  version: string;
  manifest: Record<string, unknown>;
  changelog?: string;
}

export interface ListAgentIndexInput {
  tenantId: string;
  cursor?: string;
  limit?: number;
  status?: AgentVersionStatus;
  version?: string;
  tag?: string;
  search?: string;
}

export interface AgentIndexItem {
  agent: AgentRecord;
  latestVersion?: AgentVersionRecord;
  publishedVersion?: AgentVersionRecord;
}

export interface CursorPage<TItem> {
  items: TItem[];
  nextCursor?: string | undefined;
}

export interface AuditTrailPort {
  record(event: {
    action: "AGENT_VERSION_CREATED" | "AGENT_VERSION_DEPRECATED" | "AGENT_VERSION_PUBLISHED" | "AGENT_VERSION_ROLLBACK";
    actorId?: string;
    details: Record<string, unknown>;
    tenantId: string;
  }): Promise<void>;
}

export interface AgentRegistryStore {
  ensureAgent(input: {
    id: string;
    name: string;
    tags: string[];
    tenantId: string;
  }): Promise<AgentRecord>;
  createVersion(
    input: Omit<AgentVersionRecord, "createdAt" | "id" | "publishedAt" | "status"> & {
      status?: AgentVersionStatus;
    }
  ): Promise<AgentVersionRecord>;
  listVersions(agentId: string): Promise<AgentVersionRecord[]>;
  updateVersion(agentId: string, version: string, patch: Partial<AgentVersionRecord>): Promise<AgentVersionRecord>;
  listAgentsByTenant(tenantId: string): Promise<AgentRecord[]>;
}

function decodeCursor(cursor?: string): number {
  if (!cursor) {
    return 0;
  }

  try {
    const decoded = Buffer.from(cursor, "base64url").toString("utf8");
    const asNumber = Number.parseInt(decoded, 10);
    return Number.isFinite(asNumber) ? asNumber : 0;
  } catch {
    return 0;
  }
}

function encodeCursor(value: number): string {
  return Buffer.from(String(value), "utf8").toString("base64url");
}

function stableJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableJson(item));
  }

  if (typeof value === "object" && value !== null) {
    const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
      left.localeCompare(right)
    );
    return Object.fromEntries(entries.map(([key, nested]) => [key, stableJson(nested)]));
  }

  return value;
}

export function hashManifest(manifest: Record<string, unknown>): string {
  return createHash("sha256").update(JSON.stringify(stableJson(manifest))).digest("hex");
}

export class InMemoryAgentRegistryStore implements AgentRegistryStore {
  private readonly agents = new Map<string, AgentRecord>();
  private readonly versions = new Map<string, AgentVersionRecord[]>();

  async ensureAgent(input: {
    id: string;
    name: string;
    tags: string[];
    tenantId: string;
  }): Promise<AgentRecord> {
    const now = new Date();
    const current = this.agents.get(input.id);
    if (current) {
      const updated = {
        ...current,
        name: input.name,
        tags: input.tags,
        updatedAt: now
      };
      this.agents.set(input.id, updated);
      return updated;
    }

    const created: AgentRecord = {
      createdAt: now,
      id: input.id,
      name: input.name,
      tags: input.tags,
      tenantId: input.tenantId,
      updatedAt: now
    };
    this.agents.set(input.id, created);
    return created;
  }

  async createVersion(
    input: Omit<AgentVersionRecord, "createdAt" | "id" | "publishedAt" | "status"> & {
      status?: AgentVersionStatus;
    }
  ): Promise<AgentVersionRecord> {
    const current = this.versions.get(input.agentId) ?? [];
    const created: AgentVersionRecord = {
      ...input,
      createdAt: new Date(),
      id: `agent_version_${input.agentId}_${input.version}`,
      status: input.status ?? "DRAFT"
    };
    this.versions.set(input.agentId, [...current, created]);
    return created;
  }

  async listVersions(agentId: string): Promise<AgentVersionRecord[]> {
    const versions = this.versions.get(agentId) ?? [];
    return versions.slice().sort((left, right) => semver.rcompare(left.version, right.version));
  }

  async updateVersion(
    agentId: string,
    version: string,
    patch: Partial<AgentVersionRecord>
  ): Promise<AgentVersionRecord> {
    const versions = this.versions.get(agentId) ?? [];
    const index = versions.findIndex((item) => item.version === version);

    if (index < 0) {
      throw new Error(`Version '${version}' not found for agent '${agentId}'.`);
    }

    const currentVersion = versions[index];
    if (!currentVersion) {
      throw new Error(`Version '${version}' not found for agent '${agentId}'.`);
    }

    const updated: AgentVersionRecord = {
      ...currentVersion,
      ...patch
    };

    versions[index] = updated;
    this.versions.set(agentId, versions);
    return updated;
  }

  async listAgentsByTenant(tenantId: string): Promise<AgentRecord[]> {
    return Array.from(this.agents.values()).filter((agent) => agent.tenantId === tenantId);
  }
}

function requireValidVersion(version: string): void {
  if (!semver.valid(version)) {
    throw new Error(`Invalid semver '${version}'.`);
  }
}

function requireChronologicalConsistency(previousVersion: AgentVersionRecord | undefined): void {
  if (!previousVersion) {
    return;
  }

  if (previousVersion.createdAt.getTime() > Date.now()) {
    throw new Error("Latest version has inconsistent future timestamp.");
  }
}

function requireChangelogIfNeeded(previousVersion: AgentVersionRecord | undefined, nextVersion: string, changelog?: string) {
  if (!previousVersion) {
    return;
  }

  const bumpType = semver.diff(previousVersion.version, nextVersion);
  if ((bumpType === "major" || bumpType === "minor") && (!changelog || changelog.trim().length === 0)) {
    throw new Error(`Changelog is required for ${bumpType} version bump.`);
  }
}

export class AgentRegistry {
  constructor(
    private readonly store: AgentRegistryStore = new InMemoryAgentRegistryStore(),
    private readonly auditTrail?: AuditTrailPort
  ) {}

  async createVersion(input: CreateAgentVersionInput): Promise<AgentVersionRecord> {
    requireValidVersion(input.version);
    await this.store.ensureAgent({
      id: input.agentId,
      name: input.name,
      tags: input.tags ?? [],
      tenantId: input.tenantId
    });

    const versions = await this.store.listVersions(input.agentId);
    const latest = versions[0];
    requireChronologicalConsistency(latest);

    if (latest && !semver.gt(input.version, latest.version)) {
      throw new Error(
        `New version '${input.version}' must be greater than latest '${latest.version}'.`
      );
    }

    requireChangelogIfNeeded(latest, input.version, input.changelog);

    const created = await this.store.createVersion({
      agentId: input.agentId,
      manifest: input.manifest,
      manifestDigest: hashManifest(input.manifest),
      version: input.version,
      ...(input.changelog ? { changelog: input.changelog } : {})
    });

    await this.auditTrail?.record({
      action: "AGENT_VERSION_CREATED",
      details: {
        agentId: input.agentId,
        manifestDigest: created.manifestDigest,
        version: input.version
      },
      tenantId: input.tenantId
    });

    return created;
  }

  async publishVersion(agentId: string, version: string, tenantId: string): Promise<AgentVersionRecord> {
    const versions = await this.store.listVersions(agentId);
    const target = versions.find((item) => item.version === version);
    if (!target) {
      throw new Error(`Cannot publish missing version '${version}'.`);
    }

    const published = versions.find((item) => item.status === "PUBLISHED" && item.version !== version);
    if (published) {
      await this.store.updateVersion(agentId, published.version, {
        status: "DEPRECATED"
      });
    }

    const updated = await this.store.updateVersion(agentId, version, {
      publishedAt: new Date(),
      status: "PUBLISHED"
    });

    await this.auditTrail?.record({
      action: "AGENT_VERSION_PUBLISHED",
      details: {
        agentId,
        version
      },
      tenantId
    });

    return updated;
  }

  async deprecateVersion(agentId: string, version: string, tenantId: string): Promise<AgentVersionRecord> {
    const updated = await this.store.updateVersion(agentId, version, {
      status: "DEPRECATED"
    });

    await this.auditTrail?.record({
      action: "AGENT_VERSION_DEPRECATED",
      details: {
        agentId,
        version
      },
      tenantId
    });

    return updated;
  }

  async rollbackVersion(input: {
    agentId: string;
    tenantId: string;
    targetVersion: string;
    actorId?: string;
  }): Promise<AgentVersionRecord> {
    const versions = await this.store.listVersions(input.agentId);
    const current = versions.find((item) => item.status === "PUBLISHED");
    const target = versions.find((item) => item.version === input.targetVersion);

    if (!target) {
      throw new Error(`Target rollback version '${input.targetVersion}' was not found.`);
    }

    if (current && current.version !== target.version) {
      await this.store.updateVersion(input.agentId, current.version, {
        status: "DEPRECATED"
      });
    }

    const reactivated = await this.store.updateVersion(input.agentId, target.version, {
      publishedAt: new Date(),
      status: "PUBLISHED"
    });

    await this.auditTrail?.record({
      action: "AGENT_VERSION_ROLLBACK",
      details: {
        agentId: input.agentId,
        fromVersion: current?.version,
        toVersion: input.targetVersion
      },
      tenantId: input.tenantId,
      ...(input.actorId ? { actorId: input.actorId } : {})
    });

    return reactivated;
  }

  async listByTenant(input: ListAgentIndexInput): Promise<CursorPage<AgentIndexItem>> {
    const limit = Math.max(1, Math.min(100, input.limit ?? 20));
    const offset = decodeCursor(input.cursor);
    const agents = await this.store.listAgentsByTenant(input.tenantId);

    const indexed = await Promise.all(
      agents.map(async (agent) => {
        const versions = await this.store.listVersions(agent.id);
        const filteredByVersion = input.version
          ? versions.filter((version) => version.version === input.version)
          : versions;
        const filteredByStatus = input.status
          ? filteredByVersion.filter((version) => version.status === input.status)
          : filteredByVersion.filter((version) => version.status === "PUBLISHED");
        const latestVersion = versions[0];
        const publishedVersion = versions.find((version) => version.status === "PUBLISHED");

        return {
          agent,
          latestVersion,
          matchesFilters: filteredByStatus.length > 0,
          publishedVersion
        };
      })
    );

    const filtered = indexed
      .filter((item) => item.matchesFilters)
      .filter((item) => (input.tag ? item.agent.tags.includes(input.tag) : true))
      .filter((item) =>
        input.search
          ? `${item.agent.name} ${item.agent.tags.join(" ")}`.toLowerCase().includes(input.search.toLowerCase())
          : true
      )
      .map((item) => ({
        agent: item.agent,
        ...(item.latestVersion ? { latestVersion: item.latestVersion } : {}),
        ...(item.publishedVersion ? { publishedVersion: item.publishedVersion } : {})
      }));

    const page = filtered.slice(offset, offset + limit);
    const hasNext = offset + limit < filtered.length;

    return {
      items: page,
      nextCursor: hasNext ? encodeCursor(offset + limit) : undefined
    };
  }
}

export interface PrismaLikeClient {
  agent?: {
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    upsert: (args: Record<string, unknown>) => Promise<unknown>;
  };
  agentVersion?: {
    create: (args: Record<string, unknown>) => Promise<unknown>;
    findMany: (args: Record<string, unknown>) => Promise<unknown[]>;
    updateMany: (args: Record<string, unknown>) => Promise<unknown>;
  };
}

/**
 * Optional helper for environments where Prisma models Agent/AgentVersion already exist.
 */
export function createPrismaStore(prisma: PrismaLikeClient): AgentRegistryStore {
  const agentDelegate = prisma.agent;
  const versionDelegate = prisma.agentVersion;

  if (!agentDelegate || !versionDelegate) {
    throw new Error("Prisma client does not expose agent/agentVersion delegates.");
  }

  return {
    async ensureAgent(input) {
      const upserted = (await agentDelegate.upsert({
        create: {
          id: input.id,
          name: input.name,
          tags: input.tags,
          tenantId: input.tenantId
        },
        update: {
          name: input.name,
          tags: input.tags
        },
        where: {
          id: input.id
        }
      })) as AgentRecord;
      return upserted;
    },
    async createVersion(input) {
      const created = (await versionDelegate.create({
        data: {
          ...input,
          status: input.status ?? "DRAFT"
        }
      })) as AgentVersionRecord;
      return created;
    },
    async listVersions(agentId) {
      const versions = (await versionDelegate.findMany({
        orderBy: { createdAt: "desc" },
        where: { agentId }
      })) as AgentVersionRecord[];
      return versions;
    },
    async updateVersion(agentId, version, patch) {
      await versionDelegate.updateMany({
        data: patch,
        where: {
          agentId,
          version
        }
      });

      const latest = (await versionDelegate.findMany({
        orderBy: { createdAt: "desc" },
        take: 1,
        where: {
          agentId,
          version
        }
      })) as AgentVersionRecord[];
      const updated = latest[0];

      if (!updated) {
        throw new Error(`Unable to update version '${version}' for agent '${agentId}'.`);
      }

      return updated;
    },
    async listAgentsByTenant(tenantId) {
      return (await agentDelegate.findMany({
        where: { tenantId }
      })) as AgentRecord[];
    }
  };
}

import { existsSync } from "node:fs";
import path from "node:path";

import {
  findManifestCatalogEntryByAgentId,
  isInstallableManifest,
  loadManifestCatalog,
  recommendAgentsForTenant,
  searchManifestCatalog,
  type ManifestCatalogEntry,
  type ManifestSearchFilters,
  type ManifestSearchResult
} from "@birthub/agents-core";
import { prisma } from "@birthub/database";

interface CatalogCache {
  entries: ManifestCatalogEntry[];
  loadedAt: number;
}

const CACHE_TTL_MS = 60_000;

function canFallbackApprovalStats(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.name === "PrismaClientInitializationError" ||
    error.name === "PrismaClientRustPanicError" ||
    /DATABASE_URL/i.test(error.message)
  );
}

function resolveCatalogRoot(): string {
  const candidates = [
    path.join(process.cwd(), "packages", "agent-packs"),
    path.join(process.cwd(), "..", "..", "packages", "agent-packs"),
    path.join(process.cwd(), "..", "packages", "agent-packs")
  ];

  const found = candidates.find((candidate) => existsSync(candidate));

  if (!found) {
    throw new Error("Unable to locate packages/agent-packs directory.");
  }

  return found;
}

function normalizeTagList(value: string | string[] | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const raw = Array.isArray(value) ? value.join(",") : value;
  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return parsed.length > 0 ? parsed : undefined;
}

export class MarketplaceService {
  private cache: CatalogCache | null = null;
  private readonly catalogRoot: string;

  constructor(catalogRoot = resolveCatalogRoot()) {
    this.catalogRoot = catalogRoot;
  }

  async getCatalog(forceReload = false): Promise<ManifestCatalogEntry[]> {
    const now = Date.now();

    if (!forceReload && this.cache && now - this.cache.loadedAt < CACHE_TTL_MS) {
      return this.cache.entries;
    }

    const entries = await loadManifestCatalog(this.catalogRoot);
    this.cache = {
      entries,
      loadedAt: now
    };

    return entries;
  }

  async search(input: {
    domains?: string | string[];
    industries?: string | string[];
    levels?: string | string[];
    page?: number;
    pageSize?: number;
    personas?: string | string[];
    query?: string;
    tags?: string | string[];
    useCases?: string | string[];
  }): Promise<ManifestSearchResult> {
    const catalog = await this.getCatalog();
    const domains = normalizeTagList(input.domains);
    const industries = normalizeTagList(input.industries);
    const levels = normalizeTagList(input.levels);
    const personas = normalizeTagList(input.personas);
    const tags = normalizeTagList(input.tags);
    const useCases = normalizeTagList(input.useCases);
    const filters: ManifestSearchFilters = {
      ...(domains ? { domains } : {}),
      ...(industries ? { industries } : {}),
      ...(levels ? { levels } : {}),
      ...(personas ? { personas } : {}),
      ...(tags ? { tags } : {}),
      ...(useCases ? { useCases } : {})
    };

    return searchManifestCatalog(catalog, {
      ...(Object.keys(filters).length > 0 ? { filters } : {}),
      ...(typeof input.page === "number" ? { page: input.page } : {}),
      ...(typeof input.pageSize === "number" ? { pageSize: input.pageSize } : {}),
      ...(input.query ? { query: input.query } : {})
    });
  }

  async recommend(tenantIndustry: string, limit = 6) {
    const catalog = await this.getCatalog();
    return recommendAgentsForTenant(catalog, tenantIndustry, limit);
  }

  async getApprovalStats(agentIds: string[]) {
    if (agentIds.length === 0) {
      return new Map<
        string,
        {
          approvalRate: number;
          feedbackCount: number;
        }
      >();
    }

    if (!process.env.DATABASE_URL) {
      return new Map<
        string,
        {
          approvalRate: number;
          feedbackCount: number;
        }
      >();
    }

    let feedbackRows: Array<{ agentId: string; rating: number }>;

    try {
      feedbackRows = await prisma.agentFeedback.findMany({
        select: {
          agentId: true,
          rating: true
        },
        where: {
          agentId: {
            in: agentIds
          }
        }
      });
    } catch (error) {
      if (canFallbackApprovalStats(error)) {
        return new Map<
          string,
          {
            approvalRate: number;
            feedbackCount: number;
          }
        >();
      }

      throw error;
    }

    const grouped = new Map<
      string,
      {
        feedbackCount: number;
        positive: number;
      }
    >();

    for (const row of feedbackRows) {
      const current = grouped.get(row.agentId) ?? {
        feedbackCount: 0,
        positive: 0
      };
      current.feedbackCount += 1;

      if (row.rating > 0) {
        current.positive += 1;
      }

      grouped.set(row.agentId, current);
    }

    return new Map(
      Array.from(grouped.entries()).map(([agentId, value]) => [
        agentId,
        {
          approvalRate: value.feedbackCount > 0 ? value.positive / value.feedbackCount : 0,
          feedbackCount: value.feedbackCount
        }
      ])
    );
  }

  async getAgentById(agentId: string): Promise<ManifestCatalogEntry | null> {
    const catalog = await this.getCatalog();
    return findManifestCatalogEntryByAgentId(catalog, agentId);
  }

  async getAgentDocs(agentId: string): Promise<string | null> {
    const entry = await this.getAgentById(agentId);

    if (!entry) {
      return null;
    }

    const { manifest } = entry;

    return [
      `# ${manifest.agent.name}`,
      "",
      manifest.agent.description,
      "",
      "## Keywords",
      ...manifest.keywords.map((keyword) => `- ${keyword}`),
      "",
      "## Policies",
      ...manifest.policies.map((policy) => `- **${policy.name}** (${policy.effect}): ${policy.actions.join(", ")}`),
      "",
      "## Prompt",
      manifest.agent.prompt,
      "",
      "## Skills",
      ...manifest.skills.map((skill) => `- **${skill.name}**: ${skill.description}`),
      "",
      "## Tools",
      ...manifest.tools.map((tool) => `- **${tool.name}**: ${tool.description}`)
    ].join("\n");
  }

  async getAgentChangelog(agentId: string): Promise<string[] | null> {
    const entry = await this.getAgentById(agentId);
    return entry ? entry.manifest.agent.changelog : null;
  }

  async getCapabilityMatrix(): Promise<
    Array<{
      agentId: string;
      agentName: string;
      domain: string[];
      keywords: string[];
      tools: string[];
    }>
  > {
    const catalog = await this.getCatalog();

    return catalog.filter((entry) => isInstallableManifest(entry.manifest)).map((entry) => ({
      agentId: entry.manifest.agent.id,
      agentName: entry.manifest.agent.name,
      domain: entry.manifest.tags.domain,
      keywords: entry.manifest.keywords,
      tools: entry.manifest.tools.map((tool) => tool.name)
    }));
  }
}

export const marketplaceService = new MarketplaceService();

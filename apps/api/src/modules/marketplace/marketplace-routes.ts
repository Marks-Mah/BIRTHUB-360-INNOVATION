import { Router } from "express";

import { isInstallableManifest } from "@birthub/agents-core";

import { sendEtaggedJson } from "../../common/cache/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { readTrimmedString, requireStringValue } from "../../lib/request-values.js";
import { marketplaceService } from "./marketplace-service.js";

function parsePositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.floor(parsed);
}

function readQueryString(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? first : undefined;
  }

  return undefined;
}

export function createMarketplaceRouter(): Router {
  const router = Router();

  router.get(
    "/search",
    asyncHandler(async (request, response) => {
      const searchInput: {
        domains?: string | string[];
        industries?: string | string[];
        levels?: string | string[];
        page: number;
        pageSize: number;
        personas?: string | string[];
        query: string;
        tags?: string | string[];
        useCases?: string | string[];
      } = {
        page: parsePositiveInt(request.query.page, 1),
        pageSize: parsePositiveInt(request.query.pageSize, 12),
        query: readQueryString(request.query.q) ?? ""
      };
      const domains = request.query.domain as string | string[] | undefined;
      const industries = request.query.industry as string | string[] | undefined;
      const levels = request.query.level as string | string[] | undefined;
      const personas = request.query.persona as string | string[] | undefined;
      const tags = request.query.tags as string | string[] | undefined;
      const useCases = request.query.useCase as string | string[] | undefined;

      if (domains) {
        searchInput.domains = domains;
      }

      if (industries) {
        searchInput.industries = industries;
      }

      if (levels) {
        searchInput.levels = levels;
      }

      if (personas) {
        searchInput.personas = personas;
      }

      if (tags) {
        searchInput.tags = tags;
      }

      if (useCases) {
        searchInput.useCases = useCases;
      }

      const result = await marketplaceService.search(searchInput);
      const approvalStats = await marketplaceService.getApprovalStats(
        result.results.map((entry) => entry.manifest.agent.id)
      );

      sendEtaggedJson(request, response, {
        facets: result.facets,
        page: result.page,
        pageSize: result.pageSize,
        results: result.results.map((entry) => ({
          agent: entry.manifest.agent,
          approvalRate: approvalStats.get(entry.manifest.agent.id)?.approvalRate ?? null,
          feedbackCount: approvalStats.get(entry.manifest.agent.id)?.feedbackCount ?? 0,
          installable: isInstallableManifest(entry.manifest),
          keywords: entry.manifest.keywords,
          score: entry.score,
          tags: entry.manifest.tags,
          tools: entry.manifest.tools.map((tool) => ({
            description: tool.description,
            id: tool.id,
            name: tool.name
          }))
        })),
        total: result.total
      });
    })
  );

  router.get(
    "/recommendations",
    asyncHandler(async (request, response) => {
      const tenantIndustry =
        readQueryString(request.query.tenantIndustry) ??
        readTrimmedString(request.header("x-tenant-industry")) ??
        "sales";

      const recommendations = await marketplaceService.recommend(tenantIndustry, 6);
      const approvalStats = await marketplaceService.getApprovalStats(
        recommendations.map((entry) => entry.manifest.agent.id)
      );

      sendEtaggedJson(request, response, {
        tenantIndustry,
        recommendations: recommendations.map((entry) => ({
          agent: entry.manifest.agent,
          approvalRate: approvalStats.get(entry.manifest.agent.id)?.approvalRate ?? null,
          feedbackCount: approvalStats.get(entry.manifest.agent.id)?.feedbackCount ?? 0,
          installable: isInstallableManifest(entry.manifest),
          keywords: entry.manifest.keywords,
          recommendationScore: entry.recommendationScore,
          tags: entry.manifest.tags
        }))
      });
    })
  );

  router.get(
    "/compare/matrix",
    asyncHandler(async (request, response) => {
      const matrix = await marketplaceService.getCapabilityMatrix();

      sendEtaggedJson(request, response, { matrix });
    })
  );

  router.get(
    "/:agentId/docs",
    asyncHandler(async (request, response) => {
      const agentId = requireStringValue(request.params.agentId, "Agent id is required.");

      const docs = await marketplaceService.getAgentDocs(agentId);

      if (!docs) {
        throw new ProblemDetailsError({
          detail: `Agent ${agentId} not found in catalog.`,
          status: 404,
          title: "Agent Not Found"
        });
      }

      sendEtaggedJson(request, response, { docs });
    })
  );

  router.get(
    "/:agentId/changelog",
    asyncHandler(async (request, response) => {
      const agentId = requireStringValue(request.params.agentId, "Agent id is required.");

      const changelog = await marketplaceService.getAgentChangelog(agentId);

      if (!changelog) {
        throw new ProblemDetailsError({
          detail: `Agent ${agentId} not found in catalog.`,
          status: 404,
          title: "Agent Not Found"
        });
      }

      sendEtaggedJson(request, response, { changelog });
    })
  );

  return router;
}

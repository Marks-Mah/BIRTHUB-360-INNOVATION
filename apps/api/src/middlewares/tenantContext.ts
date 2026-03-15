import { prisma, runWithTenantContext } from "@birthub/database";
import type { NextFunction, Request, Response } from "express";

import { cacheTenant, getCachedTenant } from "../common/cache/index.js";
import { ProblemDetailsError } from "../lib/problem-details.js";
import { resolveAuthorizedTenantContext } from "../modules/auth/auth.service.js";
import { annotateTenantSpan } from "../tracing.js";

type BoundTenantContext = {
  organizationId: string;
  source: "active-header" | "authenticated";
  tenantId: string;
  tenantSlug: string | null;
  userId: string;
};

declare global {
  namespace Express {
    interface Request {
      tenantContext?: Readonly<BoundTenantContext>;
    }
  }
}

async function findOrganization(tenantReference: string) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    const cachedTenant = await getCachedTenant(tenantReference);

    if (cachedTenant) {
      return cachedTenant;
    }

    const organization = await prisma.organization.findFirst({
      where: {
        OR: [{ id: tenantReference }, { slug: tenantReference }, { tenantId: tenantReference }]
      }
    });

    if (organization) {
      await cacheTenant(organization);
    }

    return organization;
  } catch {
    return null;
  }
}

async function resolveTenantFromRequest(request: Request): Promise<BoundTenantContext | null> {
  const activeTenantHeader = request.header("x-active-tenant")?.trim();
  const organizationId = request.context.organizationId;
  const tenantId = request.context.tenantId;
  const userId = request.context.userId;

  if (activeTenantHeader) {
    if (request.context.authType !== "session" || !userId) {
      throw new ProblemDetailsError({
        detail: "An authenticated session is required to switch the active tenant.",
        status: 401,
        title: "Unauthorized"
      });
    }

    const authorizedTenant = await resolveAuthorizedTenantContext({
      tenantReference: activeTenantHeader,
      userId
    });

    if (authorizedTenant.status === "not-found") {
      throw new ProblemDetailsError({
        detail: "The requested active tenant was not found.",
        status: 404,
        title: "Not Found"
      });
    }

    if (authorizedTenant.status === "forbidden") {
      throw new ProblemDetailsError({
        detail: "The authenticated user does not belong to the requested active tenant.",
        status: 403,
        title: "Forbidden"
      });
    }

    return {
      organizationId: authorizedTenant.organizationId,
      source: "active-header",
      tenantId: authorizedTenant.tenantId,
      tenantSlug: authorizedTenant.tenantSlug,
      userId
    };
  }

  if (!organizationId || !tenantId || !userId) {
    return null;
  }

  const organization =
    (await findOrganization(organizationId)) ?? (await findOrganization(tenantId));

  return {
    organizationId,
    source: "authenticated",
    tenantId,
    tenantSlug: organization?.slug ?? request.context.tenantSlug ?? null,
    userId
  };
}

// @see ADR-007
export function tenantContextMiddleware(
  request: Request,
  response: Response,
  next: NextFunction
): void {
  void resolveTenantFromRequest(request)
    .then((tenantContext) => {
      if (!tenantContext) {
        next();
        return;
      }

      Object.defineProperty(request, "tenantContext", {
        configurable: false,
        enumerable: false,
        value: Object.freeze(tenantContext),
        writable: false
      });

      request.context.organizationId = tenantContext.organizationId;
      request.context.tenantId = tenantContext.tenantId;
      request.context.tenantSlug = tenantContext.tenantSlug;
      request.context.userId = tenantContext.userId;

      response.setHeader("x-organization-id", tenantContext.organizationId);
      response.setHeader("x-tenant-id", tenantContext.tenantId);

      if (tenantContext.tenantSlug) {
        response.setHeader("x-tenant-slug", tenantContext.tenantSlug);
      }

      annotateTenantSpan({
        tenantId: tenantContext.tenantId,
        tenantSlug: tenantContext.tenantSlug
      });

      runWithTenantContext(
        {
          source: tenantContext.source,
          tenantId: tenantContext.tenantId,
          tenantSlug: tenantContext.tenantSlug,
          userId: tenantContext.userId
        },
        () => {
          next();
        }
      );
    })
    .catch(next);
}

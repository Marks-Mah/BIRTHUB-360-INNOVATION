import { Buffer } from "node:buffer";

import { prisma, runWithTenantContext } from "@birthub/database";
import type { NextFunction, Request, Response } from "express";

import { cacheTenant, getCachedTenant } from "../common/cache/index.js";
import { ProblemDetailsError } from "../lib/problem-details.js";
import { annotateTenantSpan } from "../tracing.js";

type JwtClaims = {
  memberships?: string[] | Array<{ tenantId?: string }>;
  organizationId?: string;
  planStatus?: {
    code?: string;
    hardLocked?: boolean;
    limits?: Record<string, unknown>;
    status?: string | null;
  };
  plan_status?: {
    code?: string;
    hardLocked?: boolean;
    limits?: Record<string, unknown>;
    status?: string | null;
  };
  sub?: string;
  tenantId?: string;
  tenantSlug?: string;
  userId?: string;
};

type BoundTenantContext = {
  source: "active-header" | "header" | "jwt";
  tenantId: string;
  tenantSlug: string | null;
};

async function findOrganization(tenantReference: string) {
  if (!process.env.DATABASE_URL) {
    return null;
  }

  try {
    const cachedTenant = await getCachedTenant(tenantReference);

    if (cachedTenant) {
      return cachedTenant;
    }

    return await prisma.organization.findFirst({
      where: {
        OR: [{ id: tenantReference }, { slug: tenantReference }, { tenantId: tenantReference }]
      }
    }).then(async (organization) => {
      if (organization) {
        await cacheTenant(organization);
      }

      return organization;
    });
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: Readonly<BoundTenantContext>;
    }
  }
}

function decodeJwtPayload(token: string | undefined): JwtClaims | null {
  if (!token) {
    return null;
  }

  const parts = token.split(".");

  if (parts.length < 2 || !parts[1]) {
    return null;
  }

  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf8");
    return JSON.parse(payload) as JwtClaims;
  } catch {
    return null;
  }
}

async function resolveTenantFromRequest(request: Request): Promise<BoundTenantContext | null> {
  const authorization = request.header("authorization");
  const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
  const claims = decodeJwtPayload(bearerToken);
  const activeTenantHeader = request.header("x-active-tenant")?.trim();
  const headerTenantId = request.header("x-tenant-id")?.trim();
  const userId = claims?.userId ?? claims?.sub ?? request.context.userId ?? undefined;

  if (userId) {
    request.context.userId = userId;
  }

  if (activeTenantHeader) {
    const organization = await findOrganization(activeTenantHeader);

    if (!organization) {
      throw new ProblemDetailsError({
        detail: "The requested active tenant was not found.",
        status: 404,
        title: "Not Found"
      });
    }

    if (userId) {
      const membership = await prisma.membership.findFirst({
        where: {
          tenantId: organization.tenantId,
          userId
        }
      });

      if (!membership) {
        throw new ProblemDetailsError({
          detail: "The authenticated user does not belong to the requested active tenant.",
          status: 403,
          title: "Forbidden"
        });
      }
    }

    return {
      source: "active-header",
      tenantId: organization.tenantId,
      tenantSlug: organization.slug ?? claims?.tenantSlug ?? null
    };
  }

  if (claims?.tenantId?.trim() || claims?.organizationId?.trim()) {
    const tenantReference = claims.tenantId?.trim() ?? claims.organizationId!.trim();
    const organization = await findOrganization(tenantReference);

    return {
      source: "jwt",
      tenantId: organization?.tenantId ?? tenantReference,
      tenantSlug: organization?.slug ?? claims.tenantSlug ?? null
    };
  }

  if (headerTenantId) {
    const organization = await findOrganization(headerTenantId);

    return {
      source: "header",
      tenantId: organization?.tenantId ?? headerTenantId,
      tenantSlug: organization?.slug ?? null
    };
  }

  return null;
}

function resolvePlanStatusFromClaims(claims: JwtClaims | null) {
  const planStatus = claims?.plan_status ?? claims?.planStatus;

  if (!planStatus || typeof planStatus !== "object") {
    return null;
  }

  return {
    ...(typeof planStatus.code === "string" ? { code: planStatus.code } : {}),
    ...(typeof planStatus.hardLocked === "boolean"
      ? { hardLocked: planStatus.hardLocked }
      : {}),
    ...(typeof planStatus.status === "string" || planStatus.status === null
      ? { status: planStatus.status ?? null }
      : {}),
    ...(planStatus.limits && typeof planStatus.limits === "object"
      ? { limits: planStatus.limits }
      : {})
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
      const authorization = request.header("authorization");
      const bearerToken = authorization?.startsWith("Bearer ") ? authorization.slice(7) : undefined;
      const claims = decodeJwtPayload(bearerToken);

      if (!tenantContext) {
        request.context.billingPlanStatus = resolvePlanStatusFromClaims(claims);
        next();
        return;
      }

      Object.defineProperty(request, "tenantContext", {
        configurable: false,
        enumerable: false,
        value: Object.freeze(tenantContext),
        writable: false
      });

      request.context.tenantSlug = tenantContext.tenantSlug;
      request.context.billingPlanStatus = resolvePlanStatusFromClaims(claims);

      if (!request.context.tenantId) {
        request.context.tenantId = tenantContext.tenantId;
      }

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
          userId: request.context.userId
        },
        () => {
          next();
        }
      );
    })
    .catch(next);
}

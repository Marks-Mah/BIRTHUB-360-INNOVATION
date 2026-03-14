import type { ApiConfig } from "@birthub/config";
import { prisma, Role } from "@birthub/database";
import { Router } from "express";
import { z } from "zod";

import { RequireRole, requireAuthenticated } from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { createSession } from "../auth/auth.service.js";
import { setAuthCookies } from "../auth/cookies.js";

const impersonationSchema = z
  .object({
    tenantReference: z.string().trim().min(1)
  })
  .strict();

async function resolveImpersonationTarget(tenantReference: string) {
  const organization = await prisma.organization.findFirst({
    include: {
      memberships: {
        orderBy: {
          createdAt: "asc"
        }
      }
    },
    where: {
      OR: [{ id: tenantReference }, { slug: tenantReference }, { tenantId: tenantReference }]
    }
  });

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Target organization not found.",
      status: 404,
      title: "Not Found"
    });
  }

  const membership =
    organization.memberships.find((item) => item.role === Role.OWNER) ??
    organization.memberships.find((item) => item.role === Role.ADMIN) ??
    organization.memberships[0];

  if (!membership) {
    throw new ProblemDetailsError({
      detail: "No active member found for impersonation.",
      status: 422,
      title: "Unprocessable Entity"
    });
  }

  return {
    organization,
    userId: membership.userId
  };
}

export function createAdminRouter(config: ApiConfig): Router {
  const router = Router();

  router.post(
    "/api/v1/admin/impersonations",
    requireAuthenticated,
    RequireRole(Role.SUPER_ADMIN),
    asyncHandler(async (request, response) => {
      const actorUserId = request.context.userId;

      if (!actorUserId) {
        throw new ProblemDetailsError({
          detail: "Authenticated user context is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const payload = impersonationSchema.parse(request.body);
      const target = await resolveImpersonationTarget(payload.tenantReference);
      const session = await createSession({
        config,
        ipAddress: request.ip ?? null,
        organizationId: target.organization.id,
        tenantId: target.organization.tenantId,
        userAgent: request.get("user-agent") ?? null,
        userId: target.userId
      });

      await prisma.auditLog.create({
        data: {
          action: "admin.impersonation.created",
          actorId: actorUserId,
          diff: {
            organizationId: target.organization.id,
            targetUserId: target.userId
          },
          entityId: target.organization.id,
          entityType: "organization",
          tenantId: target.organization.tenantId
        }
      });

      setAuthCookies(response, config, session.tokens);
      response.status(201).json({
        organizationId: target.organization.id,
        tenantId: target.organization.tenantId,
        tokens: session.tokens,
        userId: target.userId
      });
    })
  );

  return router;
}

import { Role } from "@birthub/database";
import {
  createOrganizationRequestSchema,
  createOrganizationResponseSchema,
  cursorPaginationQuerySchema
} from "@birthub/config";
import { Router } from "express";
import { z } from "zod";

import { Auditable } from "../../audit/auditable.js";
import {
  RequireRole,
  requireAuthenticatedSession
} from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { readTrimmedString, requireStringValue } from "../../lib/request-values.js";
import { validateBody } from "../../middleware/validate-body.js";
import {
  createOrganization,
  exportAuditLogsCsv,
  listAuditLogs,
  listMembersForOrganization,
  removeMember,
  updateMemberRole
} from "./service.js";

const memberRoleSchema = z.object({
  role: z.nativeEnum(Role)
});

const auditFilterSchema = cursorPaginationQuerySchema.extend({
  actorId: z.string().optional(),
  entityType: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional()
});

function requireTenantId(tenantId: string | null | undefined): string {
  if (!tenantId) {
    throw new ProblemDetailsError({
      detail: "Active tenant is required for this operation.",
      status: 400,
      title: "Bad Request"
    });
  }

  return tenantId;
}

export function createOrganizationsRouter(): Router {
  const router = Router();

  const createOrganizationHandler = Auditable({
    action: "organization.created",
    entityType: "organization",
    resolveEntityId: (_request, _response, result) =>
      typeof result === "object" && result && "organizationId" in result
        ? String(result.organizationId)
        : undefined,
    resolveTenantId: (_request, _response, result) =>
      typeof result === "object" && result && "tenantId" in result ? String(result.tenantId) : undefined
  })(async (request, response) => {
    const payload = createOrganizationRequestSchema.parse(request.body);
    const organization = createOrganizationResponseSchema.parse(
      await createOrganization({
        ...payload,
        requestId: request.context.requestId
      })
    );

    response.status(201).json(organization);
    return organization;
  });

  router.post("/orgs", validateBody(createOrganizationRequestSchema), asyncHandler(createOrganizationHandler));
  router.post(
    "/organizations",
    validateBody(createOrganizationRequestSchema),
    asyncHandler(createOrganizationHandler)
  );

  router.get(
    "/orgs/:id/members",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const pagination = cursorPaginationQuerySchema.parse(request.query);
      const tenantId = requireTenantId(request.context.tenantId);
      const organizationId = requireStringValue(
        request.params.id,
        "A valid organization id is required."
      );

      response.status(200).json(
        await listMembersForOrganization({
          organizationId,
          take: pagination.take,
          tenantId,
          ...(pagination.cursor ? { cursor: pagination.cursor } : {})
        })
      );
    })
  );

  router.patch(
    "/orgs/:id/members/:memberId",
    requireAuthenticatedSession,
    RequireRole(Role.OWNER),
    validateBody(memberRoleSchema),
    asyncHandler(
      Auditable({
        action: "member.role_updated",
        entityType: "member",
        requireActor: true,
        resolveEntityId: (request) => readTrimmedString(request.params.memberId)
      })(async (request, response) => {
        const tenantId = requireTenantId(request.context.tenantId);
        const memberId = requireStringValue(request.params.memberId, "A valid member id is required.");
        const organizationId = requireStringValue(
          request.params.id,
          "A valid organization id is required."
        );
        const membership = await updateMemberRole({
          memberId,
          organizationId,
          role: request.body.role,
          tenantId
        });

        response.status(200).json(membership);
        return membership ?? undefined;
      })
    )
  );

  router.delete(
    "/orgs/:id/members/:memberId",
    requireAuthenticatedSession,
    RequireRole(Role.OWNER),
    asyncHandler(
      Auditable({
        action: "member.removed",
        entityType: "member",
        requireActor: true,
        resolveEntityId: (request) => readTrimmedString(request.params.memberId)
      })(async (request, response) => {
        const tenantId = requireTenantId(request.context.tenantId);
        const memberId = requireStringValue(request.params.memberId, "A valid member id is required.");
        const organizationId = requireStringValue(
          request.params.id,
          "A valid organization id is required."
        );
        const membership = await removeMember({
          memberId,
          organizationId,
          tenantId
        });

        response.status(200).json(membership);
        return membership;
      })
    )
  );

  router.get(
    "/orgs/:id/audit",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const filters = auditFilterSchema.parse(request.query);
      const tenantId = requireTenantId(request.context.tenantId);
      const organizationId = requireStringValue(
        request.params.id,
        "A valid organization id is required."
      );

      response.status(200).json(
        await listAuditLogs({
          organizationId,
          take: filters.take,
          tenantId,
          ...(filters.actorId ? { actorId: filters.actorId } : {}),
          ...(filters.cursor ? { cursor: filters.cursor } : {}),
          ...(filters.entityType ? { entityType: filters.entityType } : {}),
          ...(filters.from ? { from: filters.from } : {}),
          ...(filters.to ? { to: filters.to } : {})
        })
      );
    })
  );

  router.get(
    "/orgs/:id/audit/export",
    requireAuthenticatedSession,
    RequireRole(Role.OWNER),
    asyncHandler(async (request, response) => {
      const filters = auditFilterSchema.partial({
        cursor: true,
        take: true
      }).parse(request.query);
      const tenantId = requireTenantId(request.context.tenantId);
      const organizationId = requireStringValue(
        request.params.id,
        "A valid organization id is required."
      );
      const csv = await exportAuditLogsCsv({
        tenantId,
        organizationId,
        ...(filters.actorId ? { actorId: filters.actorId } : {}),
        ...(filters.entityType ? { entityType: filters.entityType } : {}),
        ...(filters.from ? { from: filters.from } : {}),
        ...(filters.to ? { to: filters.to } : {})
      });

      response.setHeader("Content-Disposition", 'attachment; filename="audit.csv"');
      response.type("text/csv").send(csv);
    })
  );

  return router;
}

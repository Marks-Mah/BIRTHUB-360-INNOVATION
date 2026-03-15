import { Role } from "@birthub/database";
import {
  acceptInviteRequestSchema,
  createInviteRequestSchema,
  cursorPaginationQuerySchema
} from "@birthub/config";
import { Router } from "express";

import { Auditable } from "../../audit/auditable.js";
import {
  RequireRole,
  requireAuthenticatedSession
} from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { readTrimmedString, requireStringValue } from "../../lib/request-values.js";
import { validateBody } from "../../middleware/validate-body.js";
import { acceptInvite, createInvite, listInvites, revokeInvite } from "./service.js";

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

export function createInvitesRouter(): Router {
  const router = Router();

  router.post(
    "/invites",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    validateBody(createInviteRequestSchema),
    asyncHandler(
      Auditable({
        action: "invite.created",
        entityType: "invite",
        requireActor: true,
        resolveEntityId: (_request, _response, result) =>
          typeof result === "object" && result && "id" in result ? String(result.id) : undefined
      })(async (request, response) => {
        const tenantId = requireTenantId(request.context.tenantId);
        const organizationId = readTrimmedString(request.context.organizationId);
        const createInviteInput = createInviteRequestSchema.parse(request.body);

        if (!organizationId) {
          throw new ProblemDetailsError({
            detail: "Authenticated organization context is required to create invites.",
            status: 401,
            title: "Unauthorized"
          });
        }

        const invite = await createInvite({
          email: createInviteInput.email,
          invitedByUserId: request.context.userId,
          organizationId,
          role: createInviteInput.role as Role,
          tenantId,
          ...(createInviteInput.expiresAt ? { expiresAt: createInviteInput.expiresAt } : {})
        });

        response.status(201).json(invite);
        return invite;
      })
    )
  );

  router.get(
    "/invites",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const tenantId = requireTenantId(request.context.tenantId);
      const pagination = cursorPaginationQuerySchema.parse(request.query);

      response.status(200).json(
        await listInvites({
          take: pagination.take,
          tenantId,
          ...(pagination.cursor ? { cursor: pagination.cursor } : {})
        })
      );
    })
  );

  router.post(
    "/invites/accept",
    validateBody(acceptInviteRequestSchema),
    asyncHandler(
      Auditable({
        action: "invite.accepted",
        entityType: "invite",
        resolveEntityId: (_request, _response, result) =>
          typeof result === "object" && result && "membershipId" in result
            ? String(result.membershipId)
            : undefined,
        resolveTenantId: (_request, _response, result) =>
          typeof result === "object" && result && "tenantId" in result ? String(result.tenantId) : undefined
      })(async (request, response) => {
        const payload = acceptInviteRequestSchema.parse(request.body);
        const result = await acceptInvite({
          token: payload.token,
          ...(payload.name ? { name: payload.name } : {}),
          ...(payload.userId ? { userId: payload.userId } : {})
        });
        response.status(200).json(result);
        return result;
      })
    )
  );

  router.post(
    "/invites/:id/revoke",
    requireAuthenticatedSession,
    RequireRole(Role.ADMIN),
    asyncHandler(
      Auditable({
        action: "invite.revoked",
        entityType: "invite",
        requireActor: true,
        resolveEntityId: (request) => readTrimmedString(request.params.id)
      })(async (request, response) => {
        const tenantId = requireTenantId(request.context.tenantId);
        const invite = await revokeInvite({
          inviteId: requireStringValue(request.params.id, "A valid invite id is required."),
          tenantId
        });

        response.status(200).json(invite);
        return invite;
      })
    )
  );

  return router;
}

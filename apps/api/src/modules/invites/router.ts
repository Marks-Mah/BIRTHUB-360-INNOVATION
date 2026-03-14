import { Role } from "@birthub/database";
import {
  acceptInviteRequestSchema,
  createInviteRequestSchema,
  cursorPaginationQuerySchema
} from "@birthub/config";
import { Router } from "express";

import { Auditable } from "../../audit/auditable.js";
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
    validateBody(createInviteRequestSchema),
    asyncHandler(
      Auditable({
        action: "invite.created",
        entityType: "invite",
        resolveEntityId: (_request, _response, result) =>
          typeof result === "object" && result && "id" in result ? String(result.id) : undefined
      })(async (request, response) => {
        const tenantId = requireTenantId(request.tenantContext?.tenantId ?? request.context.tenantId);
        const organizationId = readTrimmedString(request.header("x-org-id"));

        if (!organizationId) {
          throw new ProblemDetailsError({
            detail: "x-org-id header is required to create invites.",
            status: 400,
            title: "Bad Request"
          });
        }

        const invite = await createInvite({
          email: request.body.email,
          expiresAt: request.body.expiresAt,
          invitedByUserId: request.context.userId,
          organizationId,
          role: request.body.role as Role,
          tenantId
        });

        response.status(201).json(invite);
        return invite;
      })
    )
  );

  router.get(
    "/invites",
    asyncHandler(async (request, response) => {
      const tenantId = requireTenantId(request.tenantContext?.tenantId ?? request.context.tenantId);
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
        const result = await acceptInvite(request.body);
        response.status(200).json(result);
        return result;
      })
    )
  );

  router.post(
    "/invites/:id/revoke",
    asyncHandler(
      Auditable({
        action: "invite.revoked",
        entityType: "invite",
        resolveEntityId: (request) => readTrimmedString(request.params.id)
      })(async (request, response) => {
        const tenantId = requireTenantId(request.tenantContext?.tenantId ?? request.context.tenantId);
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

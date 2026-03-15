import type { ApiConfig } from "@birthub/config";
import {
  privacyDeleteRequestSchema,
  privacyDeleteResponseSchema
} from "@birthub/config";
import { Role } from "@birthub/database";
import { Router } from "express";

import {
  RequireRole,
  requireAuthenticatedSession
} from "../../common/guards/index.js";
import { asyncHandler } from "../../lib/problem-details.js";
import { validateBody } from "../../middleware/validate-body.js";
import {
  deleteAccountAndPersonalData,
  exportTenantData,
  recordTenantDataExport
} from "./service.js";

export function createPrivacyRouter(config: ApiConfig): Router {
  const router = Router();

  router.get(
    "/export",
    requireAuthenticatedSession,
    RequireRole(Role.OWNER),
    asyncHandler(async (request, response) => {
      const payload = await exportTenantData({
        organizationReference: request.context.organizationId!,
        requestedByUserId: request.context.userId!
      });

      await recordTenantDataExport({
        organizationReference: request.context.organizationId!,
        userId: request.context.userId!
      });

      response.setHeader(
        "Content-Disposition",
        `attachment; filename="birthub360-${request.context.tenantId}-export.json"`
      );
      response.type("application/json").send(JSON.stringify(payload, null, 2));
    })
  );

  router.post(
    "/delete-account",
    requireAuthenticatedSession,
    validateBody(privacyDeleteRequestSchema),
    asyncHandler(async (request, response) => {
      const result = await deleteAccountAndPersonalData({
        config,
        confirmationText: request.body.confirmationText,
        organizationReference: request.context.organizationId!,
        userId: request.context.userId!
      });

      response.status(200).json(
        privacyDeleteResponseSchema.parse({
          ...result,
          requestId: request.context.requestId
        })
      );
    })
  );

  return router;
}

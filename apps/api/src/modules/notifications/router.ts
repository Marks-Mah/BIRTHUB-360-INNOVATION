import { Router } from "express";
import { z } from "zod";

import { requireAuthenticatedSession } from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import {
  getNotificationFeed,
  getNotificationPreferences,
  markAllNotificationsReadForUser,
  markNotificationReadForUser,
  saveNotificationPreferences
} from "./service.js";

const notificationQuerySchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(10)
});

const notificationPreferencesSchema = z
  .object({
    cookieConsent: z.enum(["ACCEPTED", "PENDING", "REJECTED"]).optional(),
    emailNotifications: z.boolean().optional(),
    inAppNotifications: z.boolean().optional(),
    marketingEmails: z.boolean().optional(),
    pushNotifications: z.boolean().optional()
  })
  .strict();

function requireUserContext(input: {
  tenantId: string | null;
  userId: string | null;
}) {
  if (!input.tenantId || !input.userId) {
    throw new ProblemDetailsError({
      detail: "Authenticated tenant and user context are required.",
      status: 401,
      title: "Unauthorized"
    });
  }

  return {
    tenantId: input.tenantId,
    userId: input.userId
  };
}

export function createNotificationsRouter(): Router {
  const router = Router();

  router.get(
    "/notifications",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const identity = requireUserContext({
        tenantId: request.context.tenantId,
        userId: request.context.userId
      });
      const query = notificationQuerySchema.parse(request.query);
      const feed = await getNotificationFeed({
        limit: query.limit,
        tenantReference: identity.tenantId,
        userId: identity.userId,
        ...(query.cursor !== undefined ? { cursor: query.cursor } : {})
      });

      response.status(200).json({
        items: feed.items,
        nextCursor: feed.nextCursor,
        requestId: request.context.requestId,
        unreadCount: feed.unreadCount
      });
    })
  );

  router.patch(
    "/notifications/read-all",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const identity = requireUserContext({
        tenantId: request.context.tenantId,
        userId: request.context.userId
      });
      const result = await markAllNotificationsReadForUser({
        tenantReference: identity.tenantId,
        userId: identity.userId
      });

      response.status(200).json({
        readCount: result.count,
        requestId: request.context.requestId
      });
    })
  );

  router.patch(
    "/notifications/:id/read",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const identity = requireUserContext({
        tenantId: request.context.tenantId,
        userId: request.context.userId
      });
      const result = await markNotificationReadForUser({
        notificationId: String(request.params.id ?? ""),
        tenantReference: identity.tenantId,
        userId: identity.userId
      });

      response.status(200).json({
        readCount: result.updated,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/notifications/preferences",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const identity = requireUserContext({
        tenantId: request.context.tenantId,
        userId: request.context.userId
      });
      const preferences = await getNotificationPreferences({
        tenantReference: identity.tenantId,
        userId: identity.userId
      });

      response.status(200).json({
        preferences,
        requestId: request.context.requestId
      });
    })
  );

  router.put(
    "/notifications/preferences",
    requireAuthenticatedSession,
    asyncHandler(async (request, response) => {
      const identity = requireUserContext({
        tenantId: request.context.tenantId,
        userId: request.context.userId
      });
      const payload = notificationPreferencesSchema.parse(request.body);
      const preferences = await saveNotificationPreferences({
        tenantReference: identity.tenantId,
        userId: identity.userId,
        ...(payload.cookieConsent !== undefined ? { cookieConsent: payload.cookieConsent } : {}),
        ...(payload.emailNotifications !== undefined ? { emailNotifications: payload.emailNotifications } : {}),
        ...(payload.inAppNotifications !== undefined ? { inAppNotifications: payload.inAppNotifications } : {}),
        ...(payload.marketingEmails !== undefined ? { marketingEmails: payload.marketingEmails } : {}),
        ...(payload.pushNotifications !== undefined ? { pushNotifications: payload.pushNotifications } : {})
      });

      response.status(200).json({
        preferences,
        requestId: request.context.requestId
      });
    })
  );

  return router;
}

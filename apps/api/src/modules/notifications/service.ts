import {
  ensureUserPreference,
  listNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  prisma,
  updateUserPreference
} from "@birthub/database";

import { ProblemDetailsError } from "../../lib/problem-details.js";

async function resolveOrganization(tenantReference: string) {
  const organization = await prisma.organization.findFirst({
    where: {
      OR: [{ id: tenantReference }, { slug: tenantReference }, { tenantId: tenantReference }]
    }
  });

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Organization not found for the active tenant context.",
      status: 404,
      title: "Not Found"
    });
  }

  return organization;
}

export async function getNotificationFeed(input: {
  cursor?: string;
  limit?: number;
  tenantReference: string;
  userId: string;
}) {
  const organization = await resolveOrganization(input.tenantReference);
  await ensureUserPreference({
    organizationId: organization.id,
    tenantId: organization.tenantId,
    userId: input.userId
  });

  return listNotifications({
    tenantId: organization.tenantId,
    userId: input.userId,
    ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
    ...(input.limit !== undefined ? { limit: input.limit } : {})
  });
}

export async function markNotificationReadForUser(input: {
  notificationId: string;
  tenantReference: string;
  userId: string;
}) {
  const organization = await resolveOrganization(input.tenantReference);
  return markNotificationAsRead({
    id: input.notificationId,
    tenantId: organization.tenantId,
    userId: input.userId
  });
}

export async function markAllNotificationsReadForUser(input: {
  tenantReference: string;
  userId: string;
}) {
  const organization = await resolveOrganization(input.tenantReference);
  return markAllNotificationsAsRead({
    tenantId: organization.tenantId,
    userId: input.userId
  });
}

export async function getNotificationPreferences(input: {
  tenantReference: string;
  userId: string;
}) {
  const organization = await resolveOrganization(input.tenantReference);
  return ensureUserPreference({
    organizationId: organization.id,
    tenantId: organization.tenantId,
    userId: input.userId
  });
}

export async function saveNotificationPreferences(input: {
  cookieConsent?: "ACCEPTED" | "PENDING" | "REJECTED";
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
  marketingEmails?: boolean;
  pushNotifications?: boolean;
  tenantReference: string;
  userId: string;
}) {
  const organization = await resolveOrganization(input.tenantReference);
  return updateUserPreference({
    organizationId: organization.id,
    tenantId: organization.tenantId,
    userId: input.userId,
    ...(input.cookieConsent !== undefined ? { cookieConsent: input.cookieConsent } : {}),
    ...(input.emailNotifications !== undefined ? { emailNotifications: input.emailNotifications } : {}),
    ...(input.inAppNotifications !== undefined ? { inAppNotifications: input.inAppNotifications } : {}),
    ...(input.marketingEmails !== undefined ? { marketingEmails: input.marketingEmails } : {}),
    ...(input.pushNotifications !== undefined ? { pushNotifications: input.pushNotifications } : {})
  });
}

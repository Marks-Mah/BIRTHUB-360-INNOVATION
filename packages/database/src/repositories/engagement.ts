import { Prisma, Role, type Membership, type Notification, type NotificationType } from "@prisma/client";

import { prisma } from "../client.js";

type JsonObject = Prisma.InputJsonValue | undefined;

export async function ensureUserPreference(input: {
  organizationId: string;
  tenantId: string;
  userId: string;
}) {
  return prisma.userPreference.upsert({
    create: {
      organizationId: input.organizationId,
      tenantId: input.tenantId,
      userId: input.userId
    },
    update: {},
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId
      }
    }
  });
}

export async function getUserPreference(input: {
  organizationId: string;
  userId: string;
}) {
  return prisma.userPreference.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId
      }
    }
  });
}

export async function updateUserPreference(input: {
  cookieConsent?: "ACCEPTED" | "PENDING" | "REJECTED";
  emailNotifications?: boolean;
  inAppNotifications?: boolean;
  marketingEmails?: boolean;
  organizationId: string;
  pushNotifications?: boolean;
  tenantId: string;
  userId: string;
}) {
  const createData: Prisma.UserPreferenceUncheckedCreateInput = {
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    userId: input.userId
  };

  if (input.cookieConsent !== undefined) {
    createData.cookieConsent = input.cookieConsent;
  }

  if (input.emailNotifications !== undefined) {
    createData.emailNotifications = input.emailNotifications;
  }

  if (input.inAppNotifications !== undefined) {
    createData.inAppNotifications = input.inAppNotifications;
  }

  if (input.marketingEmails !== undefined) {
    createData.marketingEmails = input.marketingEmails;
  }

  if (input.pushNotifications !== undefined) {
    createData.pushNotifications = input.pushNotifications;
  }

  return prisma.userPreference.upsert({
    create: createData,
    update: {
      ...(input.cookieConsent !== undefined ? { cookieConsent: input.cookieConsent } : {}),
      ...(input.emailNotifications !== undefined
        ? { emailNotifications: input.emailNotifications }
        : {}),
      ...(input.inAppNotifications !== undefined
        ? { inAppNotifications: input.inAppNotifications }
        : {}),
      ...(input.marketingEmails !== undefined
        ? { marketingEmails: input.marketingEmails }
        : {}),
      ...(input.pushNotifications !== undefined
        ? { pushNotifications: input.pushNotifications }
        : {})
    },
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.userId
      }
    }
  });
}

export async function createNotificationForUser(input: {
  content: string;
  link?: string | null;
  metadata?: JsonObject;
  organizationId: string;
  tenantId: string;
  type: NotificationType;
  userId: string;
}): Promise<Notification | null> {
  const preference = await ensureUserPreference({
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    userId: input.userId
  });

  if (!preference.inAppNotifications) {
    return null;
  }

  const notificationData: Prisma.NotificationUncheckedCreateInput = {
    content: input.content,
    link: input.link ?? null,
    organizationId: input.organizationId,
    tenantId: input.tenantId,
    type: input.type,
    userId: input.userId
  };

  if (input.metadata !== undefined) {
    notificationData.metadata = input.metadata;
  }

  return prisma.notification.create({
    data: notificationData
  });
}

export async function createNotificationForOrganizationRoles(input: {
  content: string;
  link?: string | null;
  metadata?: JsonObject;
  organizationId: string;
  roles?: Role[];
  tenantId: string;
  type: NotificationType;
}) {
  const roles = input.roles ?? [Role.OWNER, Role.ADMIN];
  const memberships = await prisma.membership.findMany({
    include: {
      user: {
        select: {
          preferences: {
            select: {
              inAppNotifications: true,
              organizationId: true
            }
          }
        }
      }
    },
    where: {
      organizationId: input.organizationId,
      role: {
        in: roles
      },
      tenantId: input.tenantId
    }
  });

  const targetUserIds = memberships
    .filter((membership: Membership & {
      user: {
        preferences: Array<{
          inAppNotifications: boolean;
          organizationId: string;
        }>;
      };
    }) => {
      const preference = membership.user.preferences.find(
        (candidate) => candidate.organizationId === input.organizationId
      );

      return preference?.inAppNotifications ?? true;
    })
    .map((membership) => membership.userId);

  if (targetUserIds.length === 0) {
    return { count: 0 };
  }

  const result = await prisma.notification.createMany({
    data: targetUserIds.map((userId: string) => {
      const notificationData: Prisma.NotificationCreateManyInput = {
        content: input.content,
        link: input.link ?? null,
        organizationId: input.organizationId,
        tenantId: input.tenantId,
        type: input.type,
        userId
      };

      if (input.metadata !== undefined) {
        notificationData.metadata = input.metadata;
      }

      return notificationData;
    })
  });

  return {
    count: result.count
  };
}

export async function listNotifications(input: {
  cursor?: string;
  limit?: number;
  tenantId: string;
  userId: string;
}) {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50);
  const notifications = await prisma.notification.findMany({
    orderBy: [
      {
        createdAt: "desc"
      },
      {
        id: "desc"
      }
    ],
    skip: input.cursor ? 1 : 0,
    take: limit + 1,
    where: {
      tenantId: input.tenantId,
      userId: input.userId
    },
    ...(input.cursor
      ? {
          cursor: {
            id: input.cursor
          }
        }
      : {})
  });

  const unreadCount = await prisma.notification.count({
    where: {
      isRead: false,
      tenantId: input.tenantId,
      userId: input.userId
    }
  });

  return {
    items: notifications.slice(0, limit),
    nextCursor: notifications.length > limit ? notifications[limit - 1]?.id ?? null : null,
    unreadCount
  };
}

export async function markNotificationAsRead(input: {
  id: string;
  tenantId: string;
  userId: string;
}) {
  const updated = await prisma.notification.updateMany({
    data: {
      isRead: true,
      readAt: new Date()
    },
    where: {
      id: input.id,
      tenantId: input.tenantId,
      userId: input.userId
    }
  });

  return {
    updated: updated.count
  };
}

export async function markAllNotificationsAsRead(input: {
  tenantId: string;
  userId: string;
}) {
  return prisma.notification.updateMany({
    data: {
      isRead: true,
      readAt: new Date()
    },
    where: {
      isRead: false,
      tenantId: input.tenantId,
      userId: input.userId
    }
  });
}

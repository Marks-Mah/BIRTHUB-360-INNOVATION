import { Role, type Membership } from "@prisma/client";

import { prisma } from "../client.js";

const rolePriority: Record<Role, number> = {
  ADMIN: 3,
  MEMBER: 2,
  OWNER: 4,
  READONLY: 1,
  SUPER_ADMIN: 5
};

export function hasRequiredRole(currentRole: Role, requiredRole: Role): boolean {
  return rolePriority[currentRole] >= rolePriority[requiredRole];
}

export async function findMembershipForTenant(
  organizationId: string,
  userId: string
): Promise<Membership | null> {
  return prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId,
        userId
      }
    }
  });
}

export async function requireMembershipForTenant(
  organizationId: string,
  userId: string
): Promise<Membership> {
  const membership = await findMembershipForTenant(organizationId, userId);

  if (!membership) {
    throw new Error("MEMBERSHIP_NOT_FOUND");
  }

  return membership;
}

export function buildTenantMembershipFilter(organizationId: string, userId: string) {
  return {
    memberships: {
      some: {
        organizationId,
        userId
      }
    }
  };
}

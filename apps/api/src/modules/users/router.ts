import { roleUpdateRequestSchema, userListQuerySchema } from "@birthub/config";
import {
  ApiKeyStatus,
  MembershipStatus,
  Role,
  prisma
} from "@birthub/database";
import { Router } from "express";

import { RequireRole, requireAuthenticated } from "../../common/guards/index.js";
import { asyncHandler, ProblemDetailsError } from "../../lib/problem-details.js";
import { validateBody } from "../../middleware/validate-body.js";
import {
  canManageRole,
  getRoleForUser,
  revokeAllSessions,
  suspendUser,
  updateUserRoleWithAudit
} from "../auth/auth.service.js";

type ListedUser = {
  email: string;
  id: string;
  name: string;
  role: Role;
  status: "ACTIVE" | "SUSPENDED";
};

function readUserId(params: Record<string, string | string[] | undefined>): string {
  const value = params.userId;

  if (typeof value === "string" && value.trim().length > 0) {
    return value;
  }

  if (Array.isArray(value) && value[0]) {
    return value[0];
  }

  throw new ProblemDetailsError({
    detail: "A valid user id is required.",
    status: 400,
    title: "Bad Request"
  });
}

async function resolveOrganizationContext(organizationReference: string): Promise<{
  id: string;
  tenantId: string;
}> {
  const organization = await prisma.organization.findFirst({
    select: {
      id: true,
      tenantId: true
    },
    where: {
      OR: [{ id: organizationReference }, { tenantId: organizationReference }]
    }
  });

  if (!organization) {
    throw new ProblemDetailsError({
      detail: "Organization context was not found.",
      status: 404,
      title: "Not Found"
    });
  }

  return organization;
}

async function listUsersForOrganization(input: {
  organizationId: string;
  role?: Role;
  search?: string;
  status?: "ACTIVE" | "SUSPENDED";
}): Promise<ListedUser[]> {
  const memberships = await prisma.membership.findMany({
    include: {
      user: true
    },
    orderBy: {
      createdAt: "asc"
    },
    where: {
      organizationId: input.organizationId,
      ...(input.role ? { role: input.role } : {})
    }
  });

  const normalizedSearch = input.search?.trim().toLowerCase() ?? "";

  return memberships
    .filter((membership) => membership.status !== MembershipStatus.REVOKED)
    .filter((membership) =>
      input.status ? membership.user.status === input.status : true
    )
    .filter((membership) =>
      normalizedSearch.length > 0
        ? `${membership.user.name} ${membership.user.email}`
            .toLowerCase()
            .includes(normalizedSearch)
        : true
    )
    .map((membership) => ({
      email: membership.user.email,
      id: membership.userId,
      name: membership.user.name,
      role: membership.role,
      status: membership.user.status
    }));
}

async function assertManageableTarget(input: {
  actorUserId: string;
  nextRole?: Role;
  organizationId: string;
  targetUserId: string;
}): Promise<Role> {
  if (input.actorUserId === input.targetUserId) {
    throw new ProblemDetailsError({
      detail: "Self-management is not allowed on this endpoint.",
      status: 400,
      title: "Bad Request"
    });
  }

  const actorRole = await getRoleForUser({
    organizationId: input.organizationId,
    userId: input.actorUserId
  });
  const targetRole = await getRoleForUser({
    organizationId: input.organizationId,
    userId: input.targetUserId
  });

  if (!actorRole || !targetRole) {
    throw new ProblemDetailsError({
      detail: "Membership context not found for actor or target user.",
      status: 404,
      title: "Not Found"
    });
  }

  if (!canManageRole(actorRole, targetRole)) {
    throw new ProblemDetailsError({
      detail: "Your role cannot manage the selected user.",
      status: 403,
      title: "Forbidden"
    });
  }

  if (input.nextRole && !canManageRole(actorRole, input.nextRole)) {
    throw new ProblemDetailsError({
      detail: "Your role cannot assign the requested target role.",
      status: 403,
      title: "Forbidden"
    });
  }

  return targetRole;
}

async function revokeUserAccess(input: {
  actorUserId: string;
  organizationId: string;
  organizationTenantId: string;
  targetUserId: string;
}) {
  const membership = await prisma.membership.findUnique({
    where: {
      organizationId_userId: {
        organizationId: input.organizationId,
        userId: input.targetUserId
      }
    }
  });

  if (!membership) {
    throw new ProblemDetailsError({
      detail: "Membership not found for the selected user.",
      status: 404,
      title: "Not Found"
    });
  }

  const revokedAt = new Date();

  await prisma.$transaction([
    prisma.membership.update({
      data: {
        status: MembershipStatus.REVOKED
      },
      where: {
        organizationId_userId: {
          organizationId: input.organizationId,
          userId: input.targetUserId
        }
      }
    }),
    prisma.session.updateMany({
      data: {
        revokedAt
      },
      where: {
        organizationId: input.organizationId,
        revokedAt: null,
        userId: input.targetUserId
      }
    }),
    prisma.apiKey.updateMany({
      data: {
        revokedAt,
        status: ApiKeyStatus.REVOKED
      },
      where: {
        organizationId: input.organizationId,
        userId: input.targetUserId
      }
    }),
    prisma.auditLog.create({
      data: {
        action: "membership.removed",
        actorId: input.actorUserId,
        diff: {
          after: {
            status: MembershipStatus.REVOKED
          },
          before: {
            status: membership.status
          }
        },
        entityId: input.targetUserId,
        entityType: "membership",
        tenantId: input.organizationTenantId
      }
    })
  ]);
}

async function handleRoleUpdate(request: {
  body: { role: "ADMIN" | "MEMBER" | "OWNER" | "READONLY" };
  context: { requestId: string; tenantId?: string | null; userId?: string | null };
  params: Record<string, string | string[] | undefined>;
}) {
  const organizationReference = request.context.tenantId;
  const actorUserId = request.context.userId;

  if (!organizationReference || !actorUserId) {
    throw new ProblemDetailsError({
      detail: "A valid authenticated session is required.",
      status: 401,
      title: "Unauthorized"
    });
  }

  const organization = await resolveOrganizationContext(organizationReference);
  const role = request.body.role as Role;
  const targetUserId = readUserId(request.params);

  await assertManageableTarget({
    actorUserId,
    nextRole: role,
    organizationId: organization.id,
    targetUserId
  });

  const membership = await updateUserRoleWithAudit({
    actorUserId,
    organizationId: organization.id,
    role,
    targetUserId
  });

  return {
    membership,
    requestId: request.context.requestId
  };
}

export function createUsersRouter(): Router {
  const router = Router();

  router.get(
    "/users",
    requireAuthenticated,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const organizationReference = request.context.tenantId;

      if (!organizationReference) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const organization = await resolveOrganizationContext(organizationReference);
      const filters = userListQuerySchema.parse(request.query);

      response.status(200).json({
        items: await listUsersForOrganization({
          organizationId: organization.id,
          ...(filters.role ? { role: filters.role as Role } : {}),
          ...(filters.search ? { search: filters.search } : {}),
          ...(filters.status ? { status: filters.status } : {})
        }),
        requestId: request.context.requestId
      });
    })
  );

  router.patch(
    "/users/:userId/suspend",
    requireAuthenticated,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const organizationReference = request.context.tenantId;
      const actorUserId = request.context.userId;

      if (!organizationReference || !actorUserId) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const organization = await resolveOrganizationContext(organizationReference);
      const targetUserId = readUserId(request.params);

      await assertManageableTarget({
        actorUserId,
        organizationId: organization.id,
        targetUserId
      });

      await suspendUser({
        actorUserId,
        organizationId: organization.id,
        targetUserId
      });
      await revokeAllSessions({
        organizationId: organization.id,
        userId: targetUserId
      });
      await prisma.apiKey.updateMany({
        data: {
          revokedAt: new Date(),
          status: ApiKeyStatus.REVOKED
        },
        where: {
          organizationId: organization.id,
          userId: targetUserId
        }
      });

      response.status(200).json({
        requestId: request.context.requestId,
        suspended: true
      });
    })
  );

  router.patch(
    "/users/:userId/role",
    requireAuthenticated,
    RequireRole(Role.ADMIN),
    validateBody(roleUpdateRequestSchema),
    asyncHandler(async (request, response) => {
      const result = await handleRoleUpdate(request);
      response.status(200).json(result);
    })
  );

  router.delete(
    "/users/:userId",
    requireAuthenticated,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const organizationReference = request.context.tenantId;
      const actorUserId = request.context.userId;

      if (!organizationReference || !actorUserId) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const organization = await resolveOrganizationContext(organizationReference);
      const targetUserId = readUserId(request.params);

      await assertManageableTarget({
        actorUserId,
        organizationId: organization.id,
        targetUserId
      });
      await revokeUserAccess({
        actorUserId,
        organizationId: organization.id,
        organizationTenantId: organization.tenantId,
        targetUserId
      });

      response.status(200).json({
        removed: true,
        requestId: request.context.requestId
      });
    })
  );

  router.get(
    "/team/members",
    requireAuthenticated,
    RequireRole(Role.ADMIN),
    asyncHandler(async (request, response) => {
      const organizationReference = request.context.tenantId;

      if (!organizationReference) {
        throw new ProblemDetailsError({
          detail: "A valid authenticated session is required.",
          status: 401,
          title: "Unauthorized"
        });
      }

      const organization = await resolveOrganizationContext(organizationReference);

      response.status(200).json({
        items: await listUsersForOrganization({
          organizationId: organization.id
        }),
        requestId: request.context.requestId
      });
    })
  );

  router.patch(
    "/team/members/:userId/role",
    requireAuthenticated,
    RequireRole(Role.ADMIN),
    validateBody(roleUpdateRequestSchema),
    asyncHandler(async (request, response) => {
      const result = await handleRoleUpdate(request);
      response.status(200).json(result);
    })
  );

  return router;
}

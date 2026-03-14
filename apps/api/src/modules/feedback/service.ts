import { prisma, Role } from "@birthub/database";

import { ProblemDetailsError } from "../../lib/problem-details.js";
import { assertRole } from "../auth/auth.service.js";

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

async function resolveExecutionForTenant(input: {
  executionId: string;
  tenantReference: string;
}) {
  const organization = await resolveOrganization(input.tenantReference);
  const execution = await prisma.agentExecution.findFirst({
    where: {
      id: input.executionId,
      tenantId: organization.tenantId
    }
  });

  if (!execution) {
    throw new ProblemDetailsError({
      detail: "Execution not found for the active tenant.",
      status: 404,
      title: "Not Found"
    });
  }

  return {
    execution,
    organization
  };
}

async function assertExecutionAccess(input: {
  executionId: string;
  tenantReference: string;
  userId: string;
}) {
  const resolved = await resolveExecutionForTenant({
    executionId: input.executionId,
    tenantReference: input.tenantReference
  });

  if (!resolved.execution.userId || resolved.execution.userId === input.userId) {
    return resolved;
  }

  const allowed = await assertRole({
    minimumRole: Role.ADMIN,
    organizationId: resolved.organization.id,
    userId: input.userId
  });

  if (!allowed) {
    throw new ProblemDetailsError({
      detail: "You do not have access to submit feedback for this execution.",
      status: 403,
      title: "Forbidden"
    });
  }

  return resolved;
}

export async function getExecutionFeedback(input: {
  executionId: string;
  tenantReference: string;
  userId: string;
}) {
  const resolved = await assertExecutionAccess(input);
  return prisma.agentFeedback.findUnique({
    where: {
      executionId_userId: {
        executionId: resolved.execution.id,
        userId: input.userId
      }
    }
  });
}

export async function saveExecutionFeedback(input: {
  executionId: string;
  expectedOutput?: string;
  notes?: string;
  rating: -1 | 0 | 1;
  tenantReference: string;
  userId: string;
}) {
  const resolved = await assertExecutionAccess(input);

  return prisma.agentFeedback.upsert({
    create: {
      agentId: resolved.execution.agentId,
      executionId: resolved.execution.id,
      expectedOutput: input.expectedOutput ?? null,
      notes: input.notes ?? null,
      organizationId: resolved.organization.id,
      rating: input.rating,
      tenantId: resolved.organization.tenantId,
      userId: input.userId
    },
    update: {
      expectedOutput: input.expectedOutput ?? null,
      notes: input.notes ?? null,
      rating: input.rating
    },
    where: {
      executionId_userId: {
        executionId: resolved.execution.id,
        userId: input.userId
      }
    }
  });
}

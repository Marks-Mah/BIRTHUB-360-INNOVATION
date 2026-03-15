import { type Prisma, prisma } from "@birthub/database";

import { invalidateTenantCache } from "./tenant-cache.js";

const MUTATION_ACTIONS = new Set(["update", "delete"]);

let middlewareRegistered = false;

type CachedOrganization = {
  id: string;
  slug: string | null;
  tenantId: string;
};

function collectTenantReferences(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value?.trim())).map((value) => value.trim()))
  );
}

function organizationToReferences(organization: CachedOrganization): string[] {
  return collectTenantReferences([organization.id, organization.slug, organization.tenantId]);
}

async function resolveOrganizationsFromWhere(where: unknown): Promise<CachedOrganization[]> {
  if (!where || typeof where !== "object") {
    return [];
  }

  const organizations = await prisma.organization.findMany({
    select: {
      id: true,
      slug: true,
      tenantId: true
    },
    where: where as Prisma.OrganizationWhereInput
  });

  return organizations.map((organization) => ({
    id: organization.id,
    slug: organization.slug ?? null,
    tenantId: organization.tenantId
  }));
}

async function resolveTenantIdsForUsers(where: unknown): Promise<string[]> {
  if (!where || typeof where !== "object") {
    return [];
  }

  const users = await prisma.user.findMany({
    select: {
      id: true
    },
    where: where as Prisma.UserWhereInput
  });

  if (users.length === 0) {
    return [];
  }

  const memberships = await prisma.membership.findMany({
    select: {
      tenantId: true
    },
    where: {
      userId: {
        in: users.map((user) => user.id)
      }
    }
  });

  return collectTenantReferences(memberships.map((membership) => membership.tenantId));
}

function organizationReferencesFromResult(result: unknown): string[] {
  if (!result || typeof result !== "object") {
    return [];
  }

  const organization = result as {
    id?: string;
    slug?: string | null;
    tenantId?: string;
  };

  return collectTenantReferences([organization.id, organization.slug ?? null, organization.tenantId]);
}

function wrapDelegateMutation(
  delegate: Record<string, unknown>,
  action: "delete" | "update",
  resolveReferencesBeforeMutation: (args: unknown) => Promise<string[]>,
  resolveReferencesAfterMutation: (result: unknown) => string[] = () => []
): void {
  const original = delegate[action];

  if (typeof original !== "function") {
    return;
  }

  delegate[action] = (async (args: unknown) => {
    const referencesBeforeMutation = await resolveReferencesBeforeMutation(args);
    const result = await original.call(delegate, args);
    const referencesAfterMutation = resolveReferencesAfterMutation(result);
    const referencesToInvalidate = collectTenantReferences([
      ...referencesBeforeMutation,
      ...referencesAfterMutation
    ]);

    if (referencesToInvalidate.length > 0) {
      await invalidateTenantCache(referencesToInvalidate);
    }

    return result;
  }) as unknown;
}

function registerByWrappingDelegates(): void {
  const prismaClient = prisma as unknown as {
    organization: Record<string, unknown>;
    user: Record<string, unknown>;
  };

  wrapDelegateMutation(
    prismaClient.organization,
    "update",
    async (args) =>
      (await resolveOrganizationsFromWhere((args as { where?: unknown })?.where)).flatMap(
        organizationToReferences
      ),
    organizationReferencesFromResult
  );
  wrapDelegateMutation(
    prismaClient.organization,
    "delete",
    async (args) =>
      (await resolveOrganizationsFromWhere((args as { where?: unknown })?.where)).flatMap(
        organizationToReferences
      ),
    organizationReferencesFromResult
  );
  wrapDelegateMutation(
    prismaClient.user,
    "update",
    async (args) => resolveTenantIdsForUsers((args as { where?: unknown })?.where)
  );
  wrapDelegateMutation(
    prismaClient.user,
    "delete",
    async (args) => resolveTenantIdsForUsers((args as { where?: unknown })?.where)
  );
}

export function registerTenantCacheInvalidationMiddleware(): void {
  if (middlewareRegistered) {
    return;
  }

  middlewareRegistered = true;
  const prismaWithMiddleware = prisma as {
    $use?: (
      middleware: (
        params: any,
        next: (params: any) => Promise<unknown>
      ) => Promise<unknown>
    ) => void;
  };

  if (typeof prismaWithMiddleware.$use !== "function") {
    registerByWrappingDelegates();
    return;
  }

  prismaWithMiddleware.$use(async (params, next) => {
    if (!params.model || !MUTATION_ACTIONS.has(params.action)) {
      return next(params);
    }

    let referencesBeforeMutation: string[] = [];

    if (params.model === "Organization") {
      const organizations = await resolveOrganizationsFromWhere(params.args?.where);
      referencesBeforeMutation = organizations.flatMap(organizationToReferences);
    }

    if (params.model === "User") {
      referencesBeforeMutation = await resolveTenantIdsForUsers(params.args?.where);
    }

    const result = await next(params);
    const referencesToInvalidate = collectTenantReferences([
      ...referencesBeforeMutation,
      ...organizationReferencesFromResult(result)
    ]);

    if (referencesToInvalidate.length > 0) {
      await invalidateTenantCache(referencesToInvalidate);
    }

    return result;
  });
}

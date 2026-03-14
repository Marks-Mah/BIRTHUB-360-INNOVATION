import { Role, type PrismaClient } from "@birthub/database";

export async function createOrganization(
  prisma: PrismaClient,
  input?: {
    name?: string;
    slug?: string;
  }
) {
  const random = Math.random().toString(36).slice(2, 8);

  return prisma.organization.create({
    data: {
      name: input?.name ?? `Organization ${random}`,
      slug: input?.slug ?? `org-${random}`
    }
  });
}

export async function createUser(
  prisma: PrismaClient,
  input?: {
    email?: string;
    name?: string;
  }
) {
  const random = Math.random().toString(36).slice(2, 8);

  return prisma.user.create({
    data: {
      email: input?.email ?? `user-${random}@birthub.local`,
      name: input?.name ?? `User ${random}`
    }
  });
}

export async function createMembership(
  prisma: PrismaClient,
  input: {
    organizationId: string;
    role?: Role;
    tenantId?: string;
    userId: string;
  }
) {
  const tenantId =
    input.tenantId ??
    (
      await prisma.organization.findUniqueOrThrow({
        select: {
          tenantId: true
        },
        where: {
          id: input.organizationId
        }
      })
    ).tenantId;

  return prisma.membership.create({
    data: {
      organizationId: input.organizationId,
      role: input.role ?? Role.MEMBER,
      tenantId,
      userId: input.userId
    }
  });
}

export async function seedCoreFixtures(prisma: PrismaClient) {
  const organization = await createOrganization(prisma, {
    name: "Fixture Org",
    slug: `fixture-${Math.random().toString(36).slice(2, 8)}`
  });

  const user = await createUser(prisma, {
    email: `fixture-${Math.random().toString(36).slice(2, 8)}@birthub.local`,
    name: "Fixture User"
  });

  const membership = await createMembership(prisma, {
    organizationId: organization.id,
    role: Role.OWNER,
    tenantId: organization.tenantId,
    userId: user.id
  });

  return { membership, organization, user };
}

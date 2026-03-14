import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const organizationBackfillTables = [
  "members",
  "sessions",
  "agents",
  "workflows",
  "customers",
  "invites",
  "subscriptions"
] as const;

async function tableExists(tableName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
    ) AS "exists"
  `;

  return rows[0]?.exists ?? false;
}

async function columnExists(tableName: string, columnName: string): Promise<boolean> {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ${tableName}
        AND column_name = ${columnName}
    ) AS "exists"
  `;

  return rows[0]?.exists ?? false;
}

async function ensureDefaultOrganization() {
  return prisma.organization.upsert({
    create: {
      name: "Default Organization",
      settings: {
        source: "legacy-backfill"
      },
      slug: "default-organization"
    },
    update: {},
    where: {
      slug: "default-organization"
    }
  });
}

async function backfillOrganizations(defaultTenantId: string): Promise<void> {
  const hasTenantColumn = await columnExists("organizations", "tenantId");

  if (!hasTenantColumn) {
    return;
  }

  await prisma.$executeRawUnsafe(
    `UPDATE "organizations" SET "tenantId" = COALESCE(NULLIF("tenantId", ''), "id", '${defaultTenantId}')`
  );
}

async function backfillChildTables(defaultTenantId: string): Promise<void> {
  for (const tableName of organizationBackfillTables) {
    if (!(await tableExists(tableName))) {
      continue;
    }

    if (!(await columnExists(tableName, "tenantId"))) {
      continue;
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "${tableName}" child
       SET "tenantId" = COALESCE(NULLIF(child."tenantId", ''), org."tenantId", '${defaultTenantId}')
       FROM "organizations" org
       WHERE child."organizationId" = org."id"
         AND (child."tenantId" IS NULL OR child."tenantId" = '')`
    );
  }

  for (const standaloneTable of ["audit_logs", "quota_usage"] as const) {
    if (!(await tableExists(standaloneTable))) {
      continue;
    }

    if (!(await columnExists(standaloneTable, "tenantId"))) {
      continue;
    }

    await prisma.$executeRawUnsafe(
      `UPDATE "${standaloneTable}"
       SET "tenantId" = COALESCE(NULLIF("tenantId", ''), '${defaultTenantId}')
       WHERE "tenantId" IS NULL OR "tenantId" = ''`
    );
  }
}

async function main(): Promise<void> {
  const defaultOrganization = await ensureDefaultOrganization();

  await backfillOrganizations(defaultOrganization.tenantId);
  await backfillChildTables(defaultOrganization.tenantId);

  console.log(
    JSON.stringify(
      {
        defaultOrganizationId: defaultOrganization.id,
        tenantId: defaultOrganization.tenantId
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

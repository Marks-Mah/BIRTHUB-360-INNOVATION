import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import bcrypt from "bcryptjs";

import { prisma } from "@birthub/database";

type MigrationOperation =
  | {
      kind: "organization.planId";
      nextValue: string;
      organizationId: string;
    }
  | {
      emailNotifications: boolean;
      inAppNotifications: boolean;
      kind: "userPreference.create";
      organizationId: string;
      tenantId: string;
      userId: string;
    }
  | {
      kind: "organization.primaryDomain";
      nextValue: string;
      organizationId: string;
    };

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function parseFlag(name: string): string | undefined {
  const flag = process.argv.find((item) => item.startsWith(`${name}=`));
  return flag ? flag.slice(name.length + 1) : undefined;
}

async function ensureRollbackSql(outputPath: string) {
  const content = `BEGIN;
-- Rollback baseline for release_v1.0.0
-- 1. Stop workers and outbound integrations.
-- 2. Restore the latest physical backup before the cycle 5 migration window.
-- 3. Re-apply only the migrations required by the previous stable release.
-- 4. Rebuild plan/subscription snapshots from backup.
ROLLBACK;
`;

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, content, "utf8");
}

async function collectOperations(starterPlanId: string): Promise<MigrationOperation[]> {
  const organizations = await prisma.organization.findMany({
    include: {
      memberships: {
        include: {
          user: true
        }
      }
    },
    orderBy: {
      createdAt: "asc"
    }
  });

  const operations: MigrationOperation[] = [];

  for (const organization of organizations) {
    if (!organization.planId) {
      operations.push({
        kind: "organization.planId",
        nextValue: starterPlanId,
        organizationId: organization.id
      });
    }

    if (!organization.primaryDomain) {
      const ownerEmail = organization.memberships[0]?.user.email;
      const derivedDomain =
        ownerEmail && ownerEmail.includes("@") ? ownerEmail.split("@")[1] ?? "" : "";

      if (derivedDomain) {
        operations.push({
          kind: "organization.primaryDomain",
          nextValue: derivedDomain,
          organizationId: organization.id
        });
      }
    }

    for (const membership of organization.memberships) {
      const existingPreference = await prisma.userPreference.findUnique({
        where: {
          organizationId_userId: {
            organizationId: organization.id,
            userId: membership.userId
          }
        }
      });

      if (!existingPreference) {
        operations.push({
          emailNotifications: true,
          inAppNotifications: true,
          kind: "userPreference.create",
          organizationId: organization.id,
          tenantId: organization.tenantId,
          userId: membership.userId
        });
      }
    }
  }

  return operations;
}

async function applyOperations(operations: MigrationOperation[]) {
  for (const operation of operations) {
    if (operation.kind === "organization.planId") {
      await prisma.organization.update({
        data: {
          planId: operation.nextValue
        },
        where: {
          id: operation.organizationId
        }
      });
      continue;
    }

    if (operation.kind === "organization.primaryDomain") {
      await prisma.organization.update({
        data: {
          primaryDomain: operation.nextValue
        },
        where: {
          id: operation.organizationId
        }
      });
      continue;
    }

    await prisma.userPreference.create({
      data: {
        cookieConsent: "PENDING",
        emailNotifications: operation.emailNotifications,
        inAppNotifications: operation.inAppNotifications,
        marketingEmails: false,
        organizationId: operation.organizationId,
        pushNotifications: false,
        tenantId: operation.tenantId,
        userId: operation.userId
      }
    });
  }
}

async function runDataQualityChecks() {
  const checks = await Promise.all([
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM members m
      JOIN organizations o ON o.id = m."organizationId"
      WHERE m."tenantId" <> o."tenantId"
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM webhook_endpoints e
      JOIN organizations o ON o.id = e."organizationId"
      WHERE e."tenantId" <> o."tenantId"
    `,
    prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM workflow_executions we
      JOIN organizations o ON o.id = we."organizationId"
      WHERE we."tenantId" <> o."tenantId"
    `
  ]);

  return {
    membershipTenantMismatches: Number(checks[0][0]?.count ?? 0),
    webhookTenantMismatches: Number(checks[1][0]?.count ?? 0),
    workflowTenantMismatches: Number(checks[2][0]?.count ?? 0)
  };
}

async function runLegacyLoginCompatibilityCheck() {
  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "asc"
    },
    select: {
      email: true,
      id: true,
      passwordHash: true
    },
    take: 10,
    where: {
      passwordHash: {
        not: ""
      }
    }
  });
  const samplePassword = process.env.LEGACY_AUTH_SAMPLE_PASSWORD;

  const checks = await Promise.all(
    users.map(async (user) => ({
      bcryptCompatible: /^\$2[aby]\$/i.test(user.passwordHash),
      email: user.email,
      id: user.id,
      passwordMatched:
        samplePassword && /^\$2[aby]\$/i.test(user.passwordHash)
          ? await bcrypt.compare(samplePassword, user.passwordHash)
          : null
    }))
  );

  return {
    checkedUsers: checks.length,
    samplePasswordProvided: Boolean(samplePassword),
    users: checks
  };
}

async function main() {
  const dryRun = hasFlag("--dry-run");
  const outputPath =
    parseFlag("--output") ??
    resolve(process.cwd(), "artifacts", "release", "final-data-migration-report.json");
  const rollbackSqlPath =
    parseFlag("--rollbackSql") ??
    resolve(process.cwd(), "docs", "release", "rollback_v1.sql");
  const hasDatabase = Boolean(process.env.DATABASE_URL);

  if (!hasDatabase) {
    const skipped = {
      appliedOperations: 0,
      checkedAt: new Date().toISOString(),
      dryRun,
      qualityChecks: null,
      rollbackSqlPath,
      skipped: true
    };
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(skipped, null, 2), "utf8");
    await ensureRollbackSql(rollbackSqlPath);
    console.log(JSON.stringify(skipped, null, 2));
    return;
  }

  const starterPlan = await prisma.plan.findFirst({
    where: {
      code: "starter"
    }
  });

  if (!starterPlan) {
    throw new Error("Starter plan not found. Seed the billing catalog before running release migration.");
  }

  const operations = await collectOperations(starterPlan.id);
  if (!dryRun) {
    await applyOperations(operations);
  }

  const [qualityChecks, legacyAuth] = await Promise.all([
    runDataQualityChecks(),
    runLegacyLoginCompatibilityCheck()
  ]);

  await ensureRollbackSql(rollbackSqlPath);

  const report = {
    appliedOperations: dryRun ? 0 : operations.length,
    checkedAt: new Date().toISOString(),
    dryRun,
    legacyAuth,
    operations,
    qualityChecks,
    rollbackSqlPath,
    skipped: false
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");
  console.log(JSON.stringify(report, null, 2));

  if (Object.values(qualityChecks).some((value) => value > 0)) {
    process.exitCode = 1;
  }
}

void main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

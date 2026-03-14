import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { prisma } from "@birthub/database";

interface Finding {
  issue: string;
  userId: string;
  value?: string | number;
}

function parseFlag(name: string): string | undefined {
  const flag = process.argv.find((item) => item.startsWith(`${name}=`));
  return flag ? flag.slice(name.length + 1) : undefined;
}

async function main() {
  const outputPath =
    parseFlag("--output") ??
    resolve(process.cwd(), "artifacts", "privacy", "anonymization-report.json");
  const targetTenantId = parseFlag("--tenantId");
  const targetUserId = parseFlag("--userId");
  const hasDatabase = Boolean(process.env.DATABASE_URL);

  if (!hasDatabase) {
    const skipped = {
      checkedAt: new Date().toISOString(),
      findings: [],
      ok: true,
      reason: "DATABASE_URL not configured",
      scannedUsers: 0,
      skipped: true
    };
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, JSON.stringify(skipped, null, 2), "utf8");
    console.log(JSON.stringify(skipped, null, 2));
    return;
  }

  const users = await prisma.user.findMany({
    orderBy: {
      createdAt: "asc"
    },
    where: {
      ...(targetUserId ? { id: targetUserId } : {}),
      ...(targetTenantId
        ? {
            memberships: {
              some: {
                tenantId: targetTenantId
              }
            }
          }
        : {})
    }
  });

  const findings: Finding[] = [];

  for (const user of users) {
    const [activeSessions, activeKeys] = await Promise.all([
      prisma.session.count({
        where: {
          revokedAt: null,
          userId: user.id
        }
      }),
      prisma.apiKey.count({
        where: {
          revokedAt: null,
          userId: user.id
        }
      })
    ]);

    const isDeletedIdentity =
      user.status === "SUSPENDED" || user.email.startsWith("deleted+");

    if (!isDeletedIdentity) {
      continue;
    }

    if (!/^deleted\+.+@privacy\.birthhub360\.invalid$/i.test(user.email)) {
      findings.push({
        issue: "deleted_user_email_not_anonymized",
        userId: user.id,
        value: user.email
      });
    }

    if (user.name !== "Deleted User") {
      findings.push({
        issue: "deleted_user_name_not_scrubbed",
        userId: user.id,
        value: user.name
      });
    }

    if (activeSessions > 0) {
      findings.push({
        issue: "deleted_user_has_active_sessions",
        userId: user.id,
        value: activeSessions
      });
    }

    if (activeKeys > 0) {
      findings.push({
        issue: "deleted_user_has_active_api_keys",
        userId: user.id,
        value: activeKeys
      });
    }
  }

  const report = {
    checkedAt: new Date().toISOString(),
    findings,
    ok: findings.length === 0,
    scannedUsers: users.length,
    skipped: false
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");

  console.log(JSON.stringify(report, null, 2));

  if (findings.length > 0) {
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

import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";

import { PrismaClient } from "@birthub/database";

import { seedCoreFixtures } from "./factories.js";

function withSchema(databaseUrl: string, schema: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.set("schema", schema);
  return url.toString();
}

function pnpmExecutable(): string {
  return process.platform === "win32" ? "pnpm.cmd" : "pnpm";
}

export interface TestDatabaseHandle {
  cleanup: () => Promise<void>;
  databaseUrl: string;
  prisma: PrismaClient;
  schema: string;
}

export async function provisionTestDatabase(baseDatabaseUrl: string): Promise<TestDatabaseHandle> {
  const schema = `test_${randomUUID().replace(/-/g, "")}`;
  const databaseUrl = withSchema(baseDatabaseUrl, schema);
  const databasePackageCwd = resolve(import.meta.dirname, "../../database");

  execFileSync(
    pnpmExecutable(),
    ["exec", "prisma", "db", "push", "--skip-generate", "--schema", "prisma/schema.prisma"],
    {
      cwd: databasePackageCwd,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl
      },
      stdio: "inherit"
    }
  );

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  });

  await seedCoreFixtures(prisma);

  return {
    cleanup: async () => {
      await prisma.$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await prisma.$disconnect();
    },
    databaseUrl,
    prisma,
    schema
  };
}

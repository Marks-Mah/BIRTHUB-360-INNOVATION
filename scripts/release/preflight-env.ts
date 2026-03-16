import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import { getApiConfig, getWebConfig, getWorkerConfig } from "@birthub/config";

type PreflightTarget = "production" | "staging";
type ScopeName = "api" | "web" | "worker";

type ScopeResult = {
  issues: string[];
  ok: boolean;
  scope: ScopeName;
};

function parseFlag(name: string): string | undefined {
  const match = process.argv.find((item) => item.startsWith(`${name}=`));
  return match ? match.slice(name.length + 1) : undefined;
}

function resolveTarget(): PreflightTarget {
  const target = parseFlag("--target");
  if (target === "staging" || target === "production") {
    return target;
  }

  throw new Error("Missing or invalid --target flag. Use --target=staging or --target=production.");
}

function parseEnvFileContent(content: string): Record<string, string> {
  const env: Record<string, string> = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

async function loadEnvOverrides(): Promise<Record<string, string>> {
  const envFile = parseFlag("--env-file");
  if (!envFile) {
    return {};
  }

  const content = await readFile(resolve(process.cwd(), envFile), "utf8");
  return parseEnvFileContent(content);
}

function buildRuntimeEnv(
  target: PreflightTarget,
  overrides: Record<string, string>
): NodeJS.ProcessEnv {
  const runtimeEnv: NodeJS.ProcessEnv = {
    ...process.env,
    ...overrides
  };

  runtimeEnv.NODE_ENV = "production";
  runtimeEnv.DEPLOYMENT_ENVIRONMENT = target;
  runtimeEnv.NEXT_PUBLIC_ENVIRONMENT = target;

  return runtimeEnv;
}

function checkScope(
  scope: ScopeName,
  check: () => unknown
): ScopeResult {
  try {
    check();
    return {
      issues: [],
      ok: true,
      scope
    };
  } catch (error) {
    return {
      issues: [error instanceof Error ? error.message : String(error)],
      ok: false,
      scope
    };
  }
}

function buildRequiredKeyReport(env: NodeJS.ProcessEnv) {
  const requiredByScope: Record<ScopeName, string[]> = {
    api: [
      "API_CORS_ORIGINS",
      "AUTH_MFA_ENCRYPTION_KEY",
      "DATABASE_URL",
      "JOB_HMAC_GLOBAL_SECRET",
      "REDIS_URL",
      "SENTRY_DSN",
      "SESSION_SECRET",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "WEB_BASE_URL"
    ],
    web: [
      "NEXT_PUBLIC_API_URL",
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SENTRY_DSN"
    ],
    worker: [
      "DATABASE_URL",
      "JOB_HMAC_GLOBAL_SECRET",
      "REDIS_URL",
      "SENTRY_DSN",
      "WEB_BASE_URL"
    ]
  };

  return Object.entries(requiredByScope).map(([scope, keys]) => ({
    missing: keys.filter((key) => !env[key]),
    present: keys.filter((key) => Boolean(env[key])),
    scope
  }));
}

async function main() {
  const target = resolveTarget();
  const overrides = await loadEnvOverrides();
  const runtimeEnv = buildRuntimeEnv(target, overrides);
  const results = [
    checkScope("api", () => getApiConfig(runtimeEnv)),
    checkScope("web", () => getWebConfig(runtimeEnv)),
    checkScope("worker", () => getWorkerConfig(runtimeEnv))
  ];
  const requiredKeys = buildRequiredKeyReport(runtimeEnv);
  const outputPath =
    parseFlag("--output") ??
    resolve(process.cwd(), "artifacts", "release", `${target}-preflight-summary.json`);
  const report = {
    checkedAt: new Date().toISOString(),
    envFile: parseFlag("--env-file") ?? null,
    ok: results.every((result) => result.ok),
    requiredKeys,
    results,
    target
  };

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(
    outputPath.replace(/\.json$/i, ".txt"),
    [
      `Target: ${target}`,
      `Checked at: ${report.checkedAt}`,
      ...results.map((result) =>
        `${result.scope}: ${result.ok ? "PASS" : `FAIL -> ${result.issues.join(" | ")}`}`
      )
    ].join("\n"),
    "utf8"
  );

  console.log(JSON.stringify(report, null, 2));

  if (!report.ok) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

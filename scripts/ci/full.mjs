import net from "node:net";
import path from "node:path";

import { projectRoot, run, runPnpm } from "./shared.mjs";

function envOrDefault(key, fallback) {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function hasEnvValue(key) {
  const value = process.env[key];
  return typeof value === "string" && value.trim().length > 0;
}

async function isTcpEndpointAvailable(port, host = "127.0.0.1", timeoutMs = 500) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port });

    const finish = (result) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(result);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

async function buildCiEnvironmentDefaults() {
  const defaults = {
    API_CORS_ORIGINS: envOrDefault("API_CORS_ORIGINS", "http://localhost:3001"),
    API_PORT: envOrDefault("API_PORT", "3000"),
    NEXT_PUBLIC_API_URL: envOrDefault("NEXT_PUBLIC_API_URL", "http://localhost:3000"),
    NEXT_PUBLIC_APP_URL: envOrDefault("NEXT_PUBLIC_APP_URL", "http://localhost:3001"),
    NEXT_PUBLIC_ENVIRONMENT: envOrDefault("NEXT_PUBLIC_ENVIRONMENT", "ci-local"),
    NODE_ENV: envOrDefault("NODE_ENV", "test"),
    QUEUE_NAME: envOrDefault("QUEUE_NAME", "birthub-cycle1"),
    SESSION_SECRET: envOrDefault("SESSION_SECRET", "ci-local-secret"),
    WEB_BASE_URL: envOrDefault("WEB_BASE_URL", "http://localhost:3001")
  };

  if (hasEnvValue("DATABASE_URL") || await isTcpEndpointAvailable(5432)) {
    defaults.DATABASE_URL = envOrDefault(
      "DATABASE_URL",
      "postgresql://postgres:postgrespassword@localhost:5432/birthub_cycle1"
    );
  }

  if (hasEnvValue("REDIS_URL") || await isTcpEndpointAvailable(6379)) {
    defaults.REDIS_URL = envOrDefault("REDIS_URL", "redis://localhost:6379");
  }

  return defaults;
}

function logInfrastructureWarnings(ciEnvironmentDefaults) {
  if (!("DATABASE_URL" in ciEnvironmentDefaults)) {
    console.warn(
      "[agent-ci] NOTE: PostgreSQL local nao foi detectado em 127.0.0.1:5432; suites com banco podem ser puladas."
    );
  }

  if (!("REDIS_URL" in ciEnvironmentDefaults)) {
    console.warn(
      "[agent-ci] NOTE: Redis local nao foi detectado em 127.0.0.1:6379; alguns fluxos podem usar fallback ou ser pulados."
    );
  }
}

const stepDefinitions = {
  build: { kind: "pnpm", args: ["build"], env: { NODE_ENV: "production" } },
  "build:core": { kind: "pnpm", args: ["build:core"], env: { NODE_ENV: "production" } },
  "build:satellites": { kind: "pnpm", args: ["build:satellites"], env: { NODE_ENV: "production" } },
  "db:generate": { kind: "pnpm", args: ["db:generate"] },
  install: { kind: "pnpm", args: ["install", "--frozen-lockfile"] },
  "lint:workflows": { kind: "pnpm", args: ["lint:workflows"] },
  lint: { kind: "pnpm", args: ["lint"] },
  "lint:core": { kind: "pnpm", args: ["lint:core"] },
  "lint:satellites": { kind: "pnpm", args: ["lint:satellites"] },
  "packs:regression": { kind: "pnpm", args: ["packs:regression"] },
  "packs:smoke": { kind: "pnpm", args: ["packs:smoke"] },
  "packs:test": { kind: "pnpm", args: ["packs:test"] },
  "packs:validate": { kind: "pnpm", args: ["packs:validate"] },
  "preflight:agents": { kind: "pnpm", args: ["preflight:agents"] },
  "preflight:core": { kind: "pnpm", args: ["preflight:core"] },
  "preflight:full": { kind: "pnpm", args: ["preflight:full"] },
  "preflight:satellites": { kind: "pnpm", args: ["preflight:satellites"] },
  "preflight:workflow-suite": { kind: "pnpm", args: ["preflight:workflow-suite"] },
  "security:guards": { kind: "pnpm", args: ["security:guards"] },
  "security:report": { kind: "pnpm", args: ["security:report"] },
  "smoke:satellites": { kind: "pnpm", args: ["smoke:satellites"] },
  test: { kind: "pnpm", args: ["test"] },
  "test:billing:coverage": { kind: "pnpm", args: ["test:billing:coverage"] },
  "test:core": { kind: "pnpm", args: ["test:core"] },
  "test:agents": { kind: "pnpm", args: ["test:agents"] },
  "test:e2e": { kind: "pnpm", args: ["test:e2e"] },
  "test:isolation": { kind: "pnpm", args: ["test:isolation"] },
  "test:satellites": { kind: "pnpm", args: ["test:satellites"] },
  "test:workflows": { kind: "pnpm", args: ["test:workflows"] },
  typecheck: { kind: "pnpm", args: ["typecheck"] },
  "typecheck:core": { kind: "pnpm", args: ["typecheck:core"] },
  "typecheck:satellites": { kind: "pnpm", args: ["typecheck:satellites"] },
  "workspace:audit": { kind: "pnpm", args: ["workspace:audit"] }
};

const taskGroups = {
  full: [
    "preflight:full",
    "workspace:audit",
    "install",
    "db:generate",
    "core",
    "satellites",
    "packs:validate",
    "packs:test",
    "packs:smoke",
    "packs:regression",
    "test:workflows",
    "test:billing:coverage",
    "security:guards",
    "security:report",
    "test:e2e"
  ],
  core: [
    "preflight:core",
    "workspace:audit",
    "lint:core",
    "typecheck:core",
    "test:core",
    "test:isolation",
    "build:core"
  ],
  "legacy-agents": ["preflight:agents", "test:agents"],
  "pack-tests": ["packs:validate", "packs:test", "packs:smoke", "packs:regression"],
  platform: ["core"],
  satellites: [
    "preflight:satellites",
    "lint:satellites",
    "typecheck:satellites",
    "test:satellites",
    "build:satellites",
    "smoke:satellites"
  ],
  "workflow-suite": [
    "preflight:workflow-suite",
    "lint:workflows",
    "test:workflows",
    "test:billing:coverage",
    "security:guards",
    "security:report"
  ]
};

function runDirtyTreeCheck() {
  run(process.execPath, [path.join(projectRoot, "scripts", "ci", "check-dirty-tree.mjs")]);
}

function runNamedStep(name, ciEnvironmentDefaults) {
  const definition = stepDefinitions[name];

  if (!definition) {
    throw new Error(`Unknown CI task '${name}'.`);
  }

  if (definition.kind === "pnpm") {
    runPnpm(definition.args, {
      env: {
        ...ciEnvironmentDefaults,
        ...(definition.env ?? {})
      }
    });
    return;
  }

  throw new Error(`Unsupported task kind for '${name}'.`);
}

function runTask(target, ciEnvironmentDefaults) {
  if (taskGroups[target]) {
    for (const step of taskGroups[target]) {
      if (taskGroups[step]) {
        runTask(step, ciEnvironmentDefaults);
      } else {
        runNamedStep(step, ciEnvironmentDefaults);
        runDirtyTreeCheck();
      }
    }
  } else {
    runNamedStep(target, ciEnvironmentDefaults);
    runDirtyTreeCheck();
  }
}

function parseTarget(mode, rest) {
  if (mode === "full") {
    return "full";
  }

  const target = rest[0];

  if (!target) {
    throw new Error("Missing task name. Use `pnpm ci:task <task-or-group>`.");
  }

  return target;
}

const [mode = "full", ...rest] = process.argv.slice(2);
const target = parseTarget(mode, rest);
const ciEnvironmentDefaults = await buildCiEnvironmentDefaults();

logInfrastructureWarnings(ciEnvironmentDefaults);

try {
  runTask(target, ciEnvironmentDefaults);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n[agent-ci] FAILED: ${message}`);
  process.exitCode = 1;
}

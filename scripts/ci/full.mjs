import path from "node:path";

import { projectRoot, run, runPnpm } from "./shared.mjs";

const ciEnvironmentDefaults = {
  API_CORS_ORIGINS: "http://localhost:3001",
  API_PORT: "3000",
  DATABASE_URL: "postgresql://postgres:postgrespassword@localhost:5432/birthub_cycle1",
  NEXT_PUBLIC_API_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3001",
  NEXT_PUBLIC_ENVIRONMENT: "ci-local",
  NODE_ENV: "test",
  QUEUE_NAME: "birthub-cycle1",
  REDIS_URL: "redis://localhost:6379",
  SESSION_SECRET: "ci-local-secret",
  WEB_BASE_URL: "http://localhost:3001"
};

const stepDefinitions = {
  build: { kind: "pnpm", args: ["build"] },
  "build:core": { kind: "pnpm", args: ["build:core"] },
  "build:satellites": { kind: "pnpm", args: ["build:satellites"] },
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
  "typecheck:satellites": { kind: "pnpm", args: ["typecheck:satellites"] }
};

const taskGroups = {
  full: [
    "preflight:full",
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
    "test:e2e",
    "test:agents"
  ],
  core: [
    "preflight:core",
    "lint:core",
    "typecheck:core",
    "test:core",
    "test:isolation",
    "build:core"
  ],
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
    "security:report",
    "test:agents"
  ]
};

function runDirtyTreeCheck() {
  run(process.execPath, [path.join(projectRoot, "scripts", "ci", "check-dirty-tree.mjs")]);
}

function runNamedStep(name) {
  const definition = stepDefinitions[name];

  if (!definition) {
    throw new Error(`Unknown CI task '${name}'.`);
  }

  if (definition.kind === "pnpm") {
    runPnpm(definition.args, { env: ciEnvironmentDefaults });
    return;
  }

  throw new Error(`Unsupported task kind for '${name}'.`);
}

function runTask(target) {
  if (taskGroups[target]) {
    for (const step of taskGroups[target]) {
      if (taskGroups[step]) {
        runTask(step);
      } else {
        runNamedStep(step);
        runDirtyTreeCheck();
      }
    }
  } else {
    runNamedStep(target);
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

try {
  runTask(target);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\n[agent-ci] FAILED: ${message}`);
  process.exitCode = 1;
}

import path from "node:path";

import { projectRoot, run, runPnpm } from "./shared.mjs";

const stepDefinitions = {
  build: { kind: "pnpm", args: ["build"] },
  "db:generate": { kind: "pnpm", args: ["db:generate"] },
  install: { kind: "pnpm", args: ["install", "--frozen-lockfile"] },
  "lint:workflows": { kind: "pnpm", args: ["lint:workflows"] },
  lint: { kind: "pnpm", args: ["lint"] },
  "packs:regression": { kind: "pnpm", args: ["packs:regression"] },
  "packs:smoke": { kind: "pnpm", args: ["packs:smoke"] },
  "packs:test": { kind: "pnpm", args: ["packs:test"] },
  "packs:validate": { kind: "pnpm", args: ["packs:validate"] },
  "security:guards": { kind: "pnpm", args: ["security:guards"] },
  "security:report": { kind: "pnpm", args: ["security:report"] },
  test: { kind: "pnpm", args: ["test"] },
  "test:agents": { kind: "pnpm", args: ["test:agents"] },
  "test:e2e": { kind: "pnpm", args: ["test:e2e"] },
  "test:isolation": { kind: "pnpm", args: ["test:isolation"] },
  "test:workflows": { kind: "pnpm", args: ["test:workflows"] },
  typecheck: { kind: "pnpm", args: ["typecheck"] }
};

const taskGroups = {
  full: [
    "install",
    "db:generate",
    "lint",
    "typecheck",
    "test",
    "test:isolation",
    "build",
    "packs:validate",
    "packs:test",
    "packs:smoke",
    "packs:regression",
    "test:workflows",
    "security:guards",
    "security:report",
    "test:e2e",
    "test:agents"
  ],
  "pack-tests": ["packs:validate", "packs:test", "packs:smoke", "packs:regression"],
  platform: ["lint", "typecheck", "test", "test:isolation", "build"],
  "workflow-suite": ["lint:workflows", "test:workflows", "security:guards", "security:report"]
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
    runPnpm(definition.args);
    return;
  }

  throw new Error(`Unsupported task kind for '${name}'.`);
}

function runTask(target) {
  if (taskGroups[target]) {
    for (const step of taskGroups[target]) {
      runNamedStep(step);
    }
  } else {
    runNamedStep(target);
  }

  runDirtyTreeCheck();
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

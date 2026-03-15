import { spawnSync } from "node:child_process";

import { buildEnv, projectRoot, run, runPnpm } from "./shared.mjs";

function runPython(args) {
  const candidates =
    process.platform === "win32"
      ? [
          { command: "python", args },
          { command: "py", args: ["-3", ...args] }
        ]
      : [
          { command: "python3", args },
          { command: "python", args }
        ];

  for (const candidate of candidates) {
    const probe = spawnSync(candidate.command, ["--version"], {
      cwd: projectRoot,
      encoding: "utf8",
      env: buildEnv(),
      stdio: "pipe"
    });

    if (!probe.error && (probe.status ?? 1) === 0) {
      run(candidate.command, candidate.args);
      return;
    }
  }

  throw new Error("Python 3.12+ is required for satellite smoke suites.");
}

const target = process.argv[2] ?? "test";

const lanes = {
  build: [
    () => runPnpm(["--filter", "@birthub/voice-engine", "build"])
  ],
  lint: [
    () => runPnpm(["--filter", "@birthub/api-gateway", "lint"]),
    () => runPnpm(["--filter", "@birthub/voice-engine", "lint"])
  ],
  smoke: [
    () => runPnpm(["--filter", "@birthub/dashboard", "test"]),
    () => runPython(["-m", "pytest", "apps/agent-orchestrator/tests", "apps/webhook-receiver/tests"])
  ],
  test: [
    () => runPnpm(["--filter", "@birthub/api-gateway", "test"]),
    () => runPnpm(["--filter", "@birthub/voice-engine", "test"]),
    () => runPnpm(["--filter", "orchestrator-worker", "test"])
  ],
  typecheck: [
    () => runPnpm(["--filter", "@birthub/voice-engine", "typecheck"])
  ]
};

const commands = lanes[target];

if (!commands) {
  throw new Error(`Unknown satellites target '${target}'.`);
}

for (const command of commands) {
  command();
}

import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

import {
  buildEnv,
  commandVersion,
  portableNodeExecutable,
  portableNodeHome,
  projectRoot,
  resolvePnpmInvocation
} from "./shared.mjs";

const minimumNodeMajor = 22;
const minimumPythonMinor = 12;

function parseVersionTuple(rawValue) {
  const match = rawValue.match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3])
  };
}

function assertNodeVersion() {
  const parsed = parseVersionTuple(process.version);
  if (!parsed || parsed.major < minimumNodeMajor) {
    throw new Error(
      `Node ${minimumNodeMajor}.x is required for this repository. Current runtime: ${process.version}. Run scripts/bootstrap/install-node-portable.ps1 or use ci-local.ps1.`
    );
  }

  return process.version;
}

function assertPnpmVersion() {
  const invocation = resolvePnpmInvocation();
  const pnpmVersion = commandVersion(invocation.command, [
    ...invocation.argsPrefix,
    "--version"
  ]);

  if (!pnpmVersion) {
    throw new Error(
      "pnpm 9.1.0 could not be resolved. Run scripts/bootstrap/install-node-portable.ps1 or install pnpm 9.1.0 in PATH."
    );
  }

  return pnpmVersion;
}

function resolvePythonCommand() {
  const candidates =
    process.platform === "win32"
      ? [
          { command: "python", args: ["--version"] },
          { command: "py", args: ["-3", "--version"] }
        ]
      : [
          { command: "python3", args: ["--version"] },
          { command: "python", args: ["--version"] }
        ];

  for (const candidate of candidates) {
    const result = spawnSync(candidate.command, candidate.args, {
      cwd: projectRoot,
      encoding: "utf8",
      env: buildEnv(),
      stdio: "pipe"
    });

    if (result.error || (result.status ?? 1) !== 0) {
      continue;
    }

    const raw = `${result.stdout}${result.stderr}`.trim();
    return { ...candidate, raw };
  }

  return null;
}

function assertPythonVersion() {
  const python = resolvePythonCommand();
  if (!python) {
    throw new Error(
      "Python 3.12+ is required for agent and satellite smoke suites. Install Python and ensure `python` or `py -3` resolves in PATH."
    );
  }

  const parsed = parseVersionTuple(python.raw);
  if (!parsed || parsed.major < 3 || parsed.minor < minimumPythonMinor) {
    throw new Error(
      `Python 3.${minimumPythonMinor}+ is required for agent and satellite smoke suites. Current runtime: ${python.raw}.`
    );
  }

  return python.raw;
}

async function assertPlaywrightBrowsers() {
  const module = await import("@playwright/test");
  const executablePath = module.chromium.executablePath();

  if (!executablePath || !existsSync(executablePath)) {
    throw new Error(
      "Playwright Chromium browser is not installed. Run `npx playwright install --with-deps chromium` or use the repository setup that provisions browsers before `pnpm test:e2e`."
    );
  }

  return executablePath;
}

function requiresPython(target) {
  return (
    target === "agents" ||
    target === "full" ||
    target === "workflow-suite" ||
    target === "satellites"
  );
}

function requiresPlaywright(target) {
  return target === "full";
}

const target = process.argv[2] ?? "core";

try {
  const nodeVersion = assertNodeVersion();
  const pnpmVersion = assertPnpmVersion();
  const summary = [
    `target=${target}`,
    `node=${nodeVersion}`,
    `pnpm=${pnpmVersion}`,
    `portableNode=${existsSync(portableNodeExecutable) ? portableNodeHome : "not-installed"}`
  ];

  if (requiresPython(target)) {
    summary.push(`python=${assertPythonVersion()}`);
  }

  if (requiresPlaywright(target)) {
    const browserPath = await assertPlaywrightBrowsers();
    summary.push(`playwright=${browserPath}`);
  }

  console.log(`[preflight] ${summary.join(" | ")}`);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`[preflight] FAILED: ${message}`);
  process.exitCode = 1;
}

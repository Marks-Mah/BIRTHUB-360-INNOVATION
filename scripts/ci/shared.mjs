import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WINDOWS_COMMAND_EXTENSIONS = [".cmd", ".exe", ".bat"];

export const projectRoot = path.resolve(__dirname, "../..");
export const portableNodeHome = path.join(projectRoot, ".tools", "node-v22.22.1-win-x64");
export const portableNodeExecutable = path.join(
  portableNodeHome,
  process.platform === "win32" ? "node.exe" : "node"
);
export const portablePnpmCli = path.join(
  portableNodeHome,
  "node_modules",
  "corepack",
  "dist",
  "pnpm.js"
);

function uniquePathEntries(entries) {
  return [...new Set(entries.filter(Boolean))];
}

function buildEnv(overrides = {}) {
  const pathEntries = uniquePathEntries([
    portableNodeHome,
    process.env.PATH,
    overrides.PATH
  ]);

  return {
    ...process.env,
    ...overrides,
    PATH: pathEntries.join(path.delimiter)
  };
}

function findCommandInPath(command, env = process.env) {
  const pathValue = env.PATH ?? "";
  const candidates = process.platform === "win32"
    ? WINDOWS_COMMAND_EXTENSIONS.map((extension) => `${command}${extension}`)
    : [command];

  for (const entry of pathValue.split(path.delimiter)) {
    if (!entry) {
      continue;
    }

    for (const candidate of candidates) {
      const fullPath = path.join(entry, candidate);
      if (existsSync(fullPath)) {
        return fullPath;
      }
    }
  }

  return null;
}

export function resolvePnpmInvocation() {
  const env = buildEnv();
  const npmExecPath = process.env.npm_execpath;

  if (npmExecPath && npmExecPath.toLowerCase().includes("pnpm")) {
    return {
      argsPrefix: [npmExecPath],
      command: process.execPath,
      env
    };
  }

  if (existsSync(portableNodeExecutable) && existsSync(portablePnpmCli)) {
    return {
      argsPrefix: [portablePnpmCli],
      command: portableNodeExecutable,
      env
    };
  }

  const pnpmPath = findCommandInPath("pnpm", env);

  if (!pnpmPath) {
    throw new Error(
      "Unable to resolve pnpm. Run scripts/bootstrap/install-node-portable.ps1 or install pnpm in PATH."
    );
  }

  return {
    argsPrefix: [],
    command: pnpmPath,
    env
  };
}

export function run(command, args, options = {}) {
  const env = buildEnv(options.env);
  console.log(`\n[agent-ci] >>> ${[command, ...args].join(" ")}`);

  const result = spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    encoding: "utf8",
    env,
    stdio: options.stdio ?? "inherit"
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 1) !== 0) {
    throw new Error(`Command failed: ${[command, ...args].join(" ")}`);
  }

  return result;
}

export function runCapture(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd ?? projectRoot,
    encoding: "utf8",
    env: buildEnv(options.env),
    stdio: "pipe"
  });
}

export function runPnpm(args, options = {}) {
  const invocation = resolvePnpmInvocation();
  return run(invocation.command, [...invocation.argsPrefix, ...args], {
    ...options,
    env: invocation.env
  });
}

export function capturePnpm(args, options = {}) {
  const invocation = resolvePnpmInvocation();
  return runCapture(invocation.command, [...invocation.argsPrefix, ...args], {
    ...options,
    env: invocation.env
  });
}

export function commandVersion(command, args = ["--version"]) {
  const result = runCapture(command, args);
  if ((result.status ?? 1) !== 0) {
    return null;
  }

  return (result.stdout || result.stderr || "").trim() || null;
}

export function formatNow() {
  return new Date().toISOString();
}

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WINDOWS_COMMAND_EXTENSIONS = [".cmd", ".exe", ".bat"];

export const projectRoot = path.resolve(__dirname, "../..");
export const portableNodeHome = path.join(projectRoot, ".tools", "node-v22.22.1-win-x64");
export const portableCorepackHome = path.join(projectRoot, ".tools", "corepack-home");
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

function resolveExistingDirectories(entries) {
  return entries.filter((entry) => entry && existsSync(entry));
}

function resolveGitHubDesktopGitEntries() {
  if (process.platform !== "win32") {
    return [];
  }

  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    return [];
  }

  const desktopRoot = path.join(localAppData, "GitHubDesktop");
  if (!existsSync(desktopRoot)) {
    return [];
  }

  return readdirSync(desktopRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.startsWith("app-"))
    .flatMap((entry) =>
      resolveExistingDirectories([
        path.join(desktopRoot, entry.name, "resources", "app", "git", "cmd"),
        path.join(desktopRoot, entry.name, "resources", "app", "git", "bin")
      ])
    );
}

function resolveCommonWindowsToolEntries() {
  if (process.platform !== "win32") {
    return [];
  }

  const programFiles = process.env.ProgramFiles ?? "C:\\Program Files";
  const programFilesX86 = process.env["ProgramFiles(x86)"] ?? "C:\\Program Files (x86)";
  const localAppData = process.env.LOCALAPPDATA ?? "";
  const appData = process.env.APPDATA ?? "";
  const userProfile = process.env.USERPROFILE ?? "";

  return [
    ...resolveExistingDirectories([
      path.join(programFiles, "nodejs"),
      path.join(programFiles, "Git", "cmd"),
      path.join(programFiles, "Git", "bin"),
      path.join(programFilesX86, "Git", "cmd"),
      path.join(programFilesX86, "Git", "bin"),
      path.join(programFiles, "Docker", "Docker", "resources", "bin"),
      path.join(localAppData, "pnpm"),
      path.join(appData, "npm"),
      path.join(userProfile, "scoop", "shims")
    ]),
    ...resolveGitHubDesktopGitEntries()
  ];
}

function resolvePortablePythonEntries() {
  const localAppData = process.env.LOCALAPPDATA;
  if (!localAppData) {
    return [];
  }

  const programsRoot = path.join(localAppData, "Programs", "Python");
  if (!existsSync(programsRoot)) {
    return [];
  }

  const pythonHomes = readdirSync(programsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && /^Python3\d{2,}$/.test(entry.name))
    .map((entry) => path.join(programsRoot, entry.name))
    .sort((left, right) => right.localeCompare(left));

  return resolveExistingDirectories([
    ...pythonHomes.flatMap((home) => [home, path.join(home, "Scripts")]),
    path.join(programsRoot, "Launcher")
  ]);
}

export function buildEnv(overrides = {}) {
  const pathEntries = uniquePathEntries([
    portableNodeHome,
    ...resolveCommonWindowsToolEntries(),
    ...resolvePortablePythonEntries(),
    overrides.PATH,
    process.env.PATH,
  ]);

  return {
    ...process.env,
    ...overrides,
    COREPACK_HOME: overrides.COREPACK_HOME ?? process.env.COREPACK_HOME ?? portableCorepackHome,
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

  if (existsSync(portableNodeExecutable) && existsSync(portablePnpmCli)) {
    return {
      argsPrefix: [portablePnpmCli],
      command: portableNodeExecutable,
      env
    };
  }

  if (npmExecPath && npmExecPath.toLowerCase().includes("pnpm")) {
    return {
      argsPrefix: [npmExecPath],
      command: process.execPath,
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

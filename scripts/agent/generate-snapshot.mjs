import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { capturePnpm, commandVersion, formatNow, projectRoot, runCapture } from "../ci/shared.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const snapshotPath = path.join(projectRoot, "AGENT_SNAPSHOT.json");
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, "package.json"), "utf8"));

function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function listWorkflowFiles() {
  const workflowRoot = path.join(projectRoot, ".github", "workflows");
  return readdirSync(workflowRoot)
    .filter((entry) => entry.endsWith(".yml") || entry.endsWith(".yaml"))
    .sort();
}

function parseGitStatus() {
  const result = runCapture("git", ["status", "--porcelain", "--untracked-files=all"]);
  if ((result.status ?? 1) !== 0) {
    return [];
  }

  return result.stdout
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const pathPart = line.includes(" -> ") ? line.split(" -> ").at(-1) : line.slice(3);
      return {
        path: normalizePath(pathPart?.trim() ?? ""),
        raw: line,
        status: line.slice(0, 2)
      };
    });
}

function scanConflictMarkers() {
  const conflicts = [];
  const skipDirectories = new Set([".git", ".next", ".tools", ".turbo", "node_modules"]);

  function walk(currentDirectory) {
    for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (skipDirectories.has(entry.name)) {
          continue;
        }
        walk(path.join(currentDirectory, entry.name));
        continue;
      }

      const fullPath = path.join(currentDirectory, entry.name);
      const relativePath = normalizePath(path.relative(projectRoot, fullPath));
      const size = statSync(fullPath).size;

      if (size > 2_000_000) {
        continue;
      }

      const content = readFileSync(fullPath, "utf8");
      if (content.includes("<<<<<<<") || content.includes("=======") || content.includes(">>>>>>>")) {
        conflicts.push(relativePath);
      }
    }
  }

  walk(projectRoot);
  return conflicts.sort();
}

function currentRuntimeSummary() {
  const pnpmVersion = capturePnpm(["--version"]);
  return {
    docker: commandVersion("docker"),
    node: process.version,
    pnpm: (pnpmVersion.stdout || pnpmVersion.stderr || "").trim() || null,
    python: commandVersion("python") ?? commandVersion("py")
  };
}

const gitStatus = parseGitStatus();
const dirtyPaths = gitStatus.map((entry) => entry.path).filter(Boolean);
const dirtyArtifacts = dirtyPaths.filter((entry) =>
  [
    ".next",
    ".nuxt",
    ".pytest_cache",
    ".turbo",
    "/.next/",
    "/.turbo/",
    "/coverage/",
    "/dist/",
    "/build/",
    "__pycache__",
    ".pyc",
    ".tsbuildinfo"
  ].some((segment) => entry.includes(segment) || entry.endsWith(segment))
);
const snapshot = {
  generatedAt: formatNow(),
  git: {
    branch: (runCapture("git", ["rev-parse", "--abbrev-ref", "HEAD"]).stdout || "").trim(),
    commit: (runCapture("git", ["rev-parse", "HEAD"]).stdout || "").trim(),
    status: gitStatus
  },
  baselineDirtyArtifacts: dirtyArtifacts,
  dirtyPaths,
  workspaces: packageJson.workspaces ?? [],
  scripts: packageJson.scripts ?? {},
  workflows: listWorkflowFiles(),
  runtimes: currentRuntimeSummary(),
  conflictMarkers: scanConflictMarkers(),
  notes: [
    "This snapshot is generated from the current workspace state.",
    "If you need a pre-change baseline, regenerate it before editing tracked files."
  ]
};

writeFileSync(snapshotPath, `${JSON.stringify(snapshot, null, 2)}\n`);
console.log(`[agent-snapshot] Wrote ${path.relative(projectRoot, snapshotPath)}`);

import { readFileSync } from "node:fs";
import path from "node:path";

import { projectRoot, runCapture } from "./shared.mjs";

const forbiddenMatchers = [
  /^agents\/birthub_shared\.egg-info\//,
  /(^|\/)\.next\//,
  /(^|\/)\.nuxt\//,
  /(^|\/)\.pytest_cache\//,
  /(^|\/)\.turbo\//,
  /(^|\/)__pycache__\//,
  /(^|\/)build\//,
  /(^|\/)coverage\//,
  /(^|\/)dist\//,
  /(^|\/)node-compile-cache\//,
  /(^|\/)playwright-report\//,
  /(^|\/)test-results\//,
  /\.pyc$/i,
  /\.tsbuildinfo$/i,
  /(^|\/)npm-debug\.log/i,
  /(^|\/)pnpm-debug\.log/i
];

function normalizePath(value) {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function parseGitStatusLine(line) {
  const trimmed = line.trimEnd();

  if (!trimmed) {
    return null;
  }

  const renamed = trimmed.includes(" -> ") ? trimmed.split(" -> ").at(-1) : trimmed.slice(3);
  return renamed ? normalizePath(renamed.trim()) : null;
}

function loadBaselineArtifacts(snapshotPath) {
  try {
    const content = JSON.parse(readFileSync(snapshotPath, "utf8"));
    return new Set(content.baselineDirtyArtifacts ?? []);
  } catch {
    return new Set();
  }
}

const snapshotPath = path.join(projectRoot, "AGENT_SNAPSHOT.json");
const gitStatus = runCapture("git", ["status", "--porcelain", "--untracked-files=all"]);

if ((gitStatus.status ?? 1) !== 0) {
  console.error(gitStatus.stderr.trim() || "Unable to read git status.");
  process.exit(1);
}

const baselineArtifacts = loadBaselineArtifacts(snapshotPath);
const currentForbiddenArtifacts = gitStatus.stdout
  .split(/\r?\n/)
  .map(parseGitStatusLine)
  .filter((value) => Boolean(value))
  .filter((value) => forbiddenMatchers.some((matcher) => matcher.test(value)));
const newForbiddenArtifacts = currentForbiddenArtifacts.filter(
  (value) => !baselineArtifacts.has(value)
);

if (newForbiddenArtifacts.length > 0) {
  console.error("[agent-ci] Dirty-tree check found new forbidden artifacts:");
  for (const artifact of newForbiddenArtifacts) {
    console.error(` - ${artifact}`);
  }
  process.exit(1);
}

console.log("[agent-ci] Dirty-tree check passed.");

import { existsSync, readdirSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");
const protectedDirectories = new Set([".git", ".tools", "node_modules"]);
const removableDirectories = new Set([
  ".next",
  ".nuxt",
  ".pytest_cache",
  ".turbo",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node-compile-cache",
  "playwright-report",
  "test-results"
]);
const removableFiles = [
  /\.pyc$/i,
  /\.tsbuildinfo$/i,
  /^npm-debug\.log/i,
  /^pnpm-debug\.log/i
];

function removePath(target, removed) {
  if (!existsSync(target)) {
    return;
  }

  rmSync(target, { force: true, recursive: true });
  removed.push(path.relative(projectRoot, target).replace(/\\/g, "/"));
}

function walk(currentDirectory, removed) {
  for (const entry of readdirSync(currentDirectory, { withFileTypes: true })) {
    const fullPath = path.join(currentDirectory, entry.name);
    const relativePath = path.relative(projectRoot, fullPath).replace(/\\/g, "/");

    if (!relativePath) {
      continue;
    }

    if (entry.isDirectory()) {
      if (protectedDirectories.has(entry.name)) {
        continue;
      }

      if (removableDirectories.has(entry.name) || relativePath === "agents/birthub_shared.egg-info") {
        removePath(fullPath, removed);
        continue;
      }

      walk(fullPath, removed);
      continue;
    }

    if (removableFiles.some((pattern) => pattern.test(entry.name))) {
      removePath(fullPath, removed);
    }
  }
}

const removed = [];

if (!statSync(projectRoot).isDirectory()) {
  throw new Error(`Project root not found: ${projectRoot}`);
}

walk(projectRoot, removed);

if (removed.length === 0) {
  console.log("[clean] No generated artifacts were present.");
} else {
  console.log("[clean] Removed generated artifacts:");
  for (const entry of removed) {
    console.log(` - ${entry}`);
  }
}

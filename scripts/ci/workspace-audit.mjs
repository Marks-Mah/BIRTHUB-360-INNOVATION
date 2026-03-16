import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { projectRoot } from "./shared.mjs";

const ignoredDirectoryNames = new Set([
  ".git",
  ".next",
  ".turbo",
  "coverage",
  "dist",
  "node_modules",
  "test-results"
]);

const importRules = [
  {
    allowedRoots: ["apps/agent-orchestrator", "apps/api-gateway", "apps/dashboard", "packages/db"],
    description: "@birthub/db is the legacy CRM schema and must stay isolated to legacy workspaces.",
    packageName: "@birthub/db"
  },
  {
    allowedRoots: ["apps/api", "apps/web", "apps/worker", "packages/database", "packages/testing"],
    description:
      "@birthub/database is the multi-tenant SaaS schema and must not leak into legacy CRM workspaces.",
    packageName: "@birthub/database"
  }
];

function walkFiles(rootRelativePath) {
  const rootDirectory = path.join(projectRoot, rootRelativePath);
  const collectedFiles = [];
  const queue = [rootDirectory];

  while (queue.length > 0) {
    const current = queue.pop();
    if (!current) {
      continue;
    }

    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirectoryNames.has(entry.name)) {
          queue.push(fullPath);
        }
        continue;
      }

      collectedFiles.push(fullPath);
    }
  }

  return collectedFiles;
}

function toRepoRelativePath(absolutePath) {
  return path.relative(projectRoot, absolutePath).replaceAll("\\", "/");
}

function collectSourceFiles() {
  return ["apps", "packages", "agents"].flatMap((rootRelativePath) =>
    walkFiles(rootRelativePath).filter((absolutePath) => /\.(?:[cm]?[jt]sx?|json)$/.test(absolutePath))
  );
}

function collectScriptPathIssues(rootPackage) {
  const issues = [];
  const pathPattern =
    /(?:^|[\s"'`])(?:\.\/)?((?:apps|agents|packages|scripts|tests|infra|docs|\.github)[^"'`\s]+?\.(?:[cm]?[jt]sx?|py|ps1|sh|ya?ml))/g;

  for (const [scriptName, scriptValue] of Object.entries(rootPackage.scripts ?? {})) {
    const matches = [...String(scriptValue).matchAll(pathPattern)];

    for (const match of matches) {
      const relativePath = match[1];
      if (!relativePath) {
        continue;
      }

      const absolutePath = path.join(projectRoot, relativePath);
      if (!existsSync(absolutePath)) {
        issues.push(`package.json script "${scriptName}" references missing path ${relativePath}`);
      }
    }
  }

  return issues;
}

function collectImportBoundaryIssues() {
  const issues = [];
  const sourceFiles = collectSourceFiles();

  for (const absolutePath of sourceFiles) {
    const relativePath = toRepoRelativePath(absolutePath);
    const content = readFileSync(absolutePath, "utf8");

    for (const rule of importRules) {
      if (!content.includes(rule.packageName)) {
        continue;
      }

      const isAllowed = rule.allowedRoots.some((allowedRoot) =>
        relativePath.startsWith(`${allowedRoot}/`)
      );
      if (!isAllowed) {
        issues.push(`${relativePath} imports ${rule.packageName}. ${rule.description}`);
      }
    }
  }

  return issues;
}

function collectKnownConflictIssues(rootPackage) {
  const issues = [];

  if (!existsSync(path.join(projectRoot, "agents", "pos-venda", "main.py"))) {
    issues.push("Expected agents/pos-venda/main.py to exist for the legacy Python runtime.");
  }

  if (!existsSync(path.join(projectRoot, "agents", "pos_venda", "worker.ts"))) {
    issues.push("Expected agents/pos_venda/worker.ts to exist for the worker package.");
  }

  if (rootPackage.scripts?.["dev:pos-venda-worker"] !== "tsx agents/pos_venda/worker.ts") {
    issues.push('package.json script "dev:pos-venda-worker" must target agents/pos_venda/worker.ts.');
  }

  return issues;
}

function main() {
  const rootPackagePath = path.join(projectRoot, "package.json");
  const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
  const issues = [
    ...collectScriptPathIssues(rootPackage),
    ...collectImportBoundaryIssues(),
    ...collectKnownConflictIssues(rootPackage)
  ];

  if (issues.length > 0) {
    console.error("[workspace-audit] FAILED");
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("[workspace-audit] ok");
}

main();

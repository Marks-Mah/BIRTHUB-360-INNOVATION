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

const workspaceContractPath = path.join(projectRoot, "scripts", "ci", "workspace-contract.json");

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
  const workspaceContract = JSON.parse(readFileSync(workspaceContractPath, "utf8"));

  for (const absolutePath of sourceFiles) {
    const relativePath = toRepoRelativePath(absolutePath);
    const content = readFileSync(absolutePath, "utf8");

    for (const rule of workspaceContract.importRules) {
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

function collectConflictIssues(rootPackage) {
  const issues = [];
  const workspaceContract = JSON.parse(readFileSync(workspaceContractPath, "utf8"));

  for (const conflict of workspaceContract.conflicts) {
    if (!existsSync(path.join(projectRoot, conflict.requiredPath))) {
      issues.push(`Missing required workspace path ${conflict.requiredPath}. ${conflict.description}`);
    }
  }

  for (const expectedScript of workspaceContract.expectedScriptValues) {
    if (rootPackage.scripts?.[expectedScript.script] !== expectedScript.value) {
      issues.push(
        `package.json script "${expectedScript.script}" must be "${expectedScript.value}".`
      );
    }
  }

  return issues;
}

function collectReleaseCoreLaneIssues(rootPackage) {
  const issues = [];
  const workspaceContract = JSON.parse(readFileSync(workspaceContractPath, "utf8"));
  const requiredByScript = workspaceContract.releaseCoreScripts.requiredByScript ?? {};
  const forbiddenFilters = workspaceContract.releaseCoreScripts.forbiddenFilters ?? [];

  for (const [scriptName, requiredFilters] of Object.entries(requiredByScript)) {
    const scriptValue = String(rootPackage.scripts?.[scriptName] ?? "");
    if (!scriptValue) {
      issues.push(`package.json is missing required script "${scriptName}".`);
      continue;
    }

    for (const requiredFilter of requiredFilters) {
      if (!scriptValue.includes(requiredFilter)) {
        issues.push(
          `package.json script "${scriptName}" must include the release-critical filter ${requiredFilter}.`
        );
      }
    }

    for (const forbiddenFilter of forbiddenFilters) {
      if (scriptValue.includes(forbiddenFilter)) {
        issues.push(
          `package.json script "${scriptName}" must not include legacy filter ${forbiddenFilter}.`
        );
      }
    }
  }

  return issues;
}

function main() {
  const rootPackagePath = path.join(projectRoot, "package.json");
  const rootPackage = JSON.parse(readFileSync(rootPackagePath, "utf8"));
  const issues = [
    ...collectScriptPathIssues(rootPackage),
    ...collectImportBoundaryIssues(),
    ...collectConflictIssues(rootPackage),
    ...collectReleaseCoreLaneIssues(rootPackage)
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

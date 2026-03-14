import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REQUIRED_STEP_TYPES = [
  "TRIGGER_WEBHOOK",
  "TRIGGER_CRON",
  "TRIGGER_EVENT",
  "HTTP_REQUEST",
  "CONDITION",
  "CODE",
  "TRANSFORMER",
  "SEND_NOTIFICATION",
  "AGENT_EXECUTE",
  "AI_TEXT_EXTRACT",
  "DELAY"
] as const;

async function collectTestFiles(dirPath: string): Promise<string[]> {
  const entries = await readdir(dirPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectTestFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".test.ts")) {
      files.push(entryPath);
    }
  }

  return files;
}

async function main(): Promise<void> {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const rootDir = path.resolve(scriptDir, "..");
  const testDirs = [
    path.join(rootDir, "packages", "workflows-core", "test"),
    path.join(rootDir, "apps", "worker", "src", "engine")
  ];

  const testFiles = (
    await Promise.all(testDirs.map((dirPath) => collectTestFiles(dirPath)))
  ).flat();
  const contents = await Promise.all(
    testFiles.map(async (filePath) => ({
      content: await readFile(filePath, "utf8"),
      filePath
    }))
  );

  const coverage = new Map<string, string[]>();

  for (const stepType of REQUIRED_STEP_TYPES) {
    coverage.set(
      stepType,
      contents
        .filter(({ content }) => content.includes(stepType))
        .map(({ filePath }) => path.relative(rootDir, filePath))
    );
  }

  const missing = Array.from(coverage.entries()).filter(([, files]) => files.length === 0);

  if (missing.length > 0) {
    const details = missing.map(([stepType]) => stepType).join(", ");
    throw new Error(`Missing workflow step coverage for: ${details}`);
  }

  for (const [stepType, files] of coverage.entries()) {
    console.log(`${stepType}: ${files.join(", ")}`);
  }
}

void main();

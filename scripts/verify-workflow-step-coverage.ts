import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
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

    if (
      entry.isFile() &&
      (entry.name.endsWith(".test.ts") || entry.name.endsWith(".spec.ts"))
    ) {
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
    path.join(rootDir, "apps", "worker", "src", "engine"),
    path.join(rootDir, "tests", "e2e")
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

  const criticalScenarios = [
    {
      file: "apps/worker/src/engine/runner.workflow-chain.test.ts",
      id: "6.8.C3",
      label: "HTTP and email side-effects are mocked inside the automated workflow suite",
      patterns: [/partner\.birthhub\.test\/lead-score/, /notificationDispatcher/, /SEND_NOTIFICATION/]
    },
    {
      file: "tests/e2e/workflow-editor-evidence.spec.ts",
      id: "6.10.C1",
      label: "Workflow editor evidence test persists the 10-node canvas artifact path",
      patterns: [/workflow-editor-10-nodes\.png/, /Node Sidebar/, /toHaveCount\(10\)/]
    },
    {
      file: "tests/e2e/workflow-agent-output.spec.ts",
      id: "6.10.C4",
      label: "Workflow runs and agent output debugger are covered by a dedicated E2E flow",
      patterns: [/\/workflows\/demo\/runs/, /Outputs de Agente/, /Salvar feedback corretivo/]
    }
  ].map((scenario) => {
    const absolutePath = path.join(rootDir, scenario.file);
    const content = contents.find(({ filePath }) => filePath === absolutePath)?.content ?? "";
    return {
      ...scenario,
      covered: scenario.patterns.every((pattern) => pattern.test(content))
    };
  });

  const missingScenarios = criticalScenarios.filter((scenario) => !scenario.covered);
  const jsonPath = path.join(rootDir, "test-results", "workflow-coverage.json");
  const markdownPath = path.join(rootDir, "docs", "evidence", "workflow-coverage.md");
  const summary = {
    coverage: Object.fromEntries(coverage),
    criticalScenarios,
    generatedAt: new Date().toISOString(),
    requiredStepTypes: REQUIRED_STEP_TYPES
  };

  const markdown = `# Workflow Coverage Report

- Generated at: ${summary.generatedAt}
- Required step types: ${REQUIRED_STEP_TYPES.length}
- Critical scenarios:
${criticalScenarios
  .map((scenario) => `  - ${scenario.id} ${scenario.covered ? "PASS" : "FAIL"} - ${scenario.label} (${scenario.file})`)
  .join("\n")}

## Step type coverage

${Array.from(coverage.entries())
  .map(([stepType, files]) => `- ${stepType}: ${files.join(", ")}`)
  .join("\n")}
`;

  await mkdir(path.dirname(jsonPath), { recursive: true });
  await mkdir(path.dirname(markdownPath), { recursive: true });
  await writeFile(jsonPath, JSON.stringify(summary, null, 2));
  await writeFile(markdownPath, markdown, "utf8");

  if (missing.length > 0) {
    const details = missing.map(([stepType]) => stepType).join(", ");
    throw new Error(`Missing workflow step coverage for: ${details}`);
  }

  if (missingScenarios.length > 0) {
    const details = missingScenarios.map((scenario) => scenario.id).join(", ");
    throw new Error(`Missing workflow critical coverage for: ${details}`);
  }

  for (const [stepType, files] of coverage.entries()) {
    console.log(`${stepType}: ${files.join(", ")}`);
  }

  for (const scenario of criticalScenarios) {
    console.log(`${scenario.id}: ${scenario.file}`);
  }
}

void main();

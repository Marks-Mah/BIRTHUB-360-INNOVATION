import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { spawn } from "node:child_process";

type SmokeCommand = {
  command: string;
  cwd: string;
  name: string;
};

function parseFlag(name: string): string | undefined {
  const flag = process.argv.find((item) => item.startsWith(`${name}=`));
  return flag ? flag.slice(name.length + 1) : undefined;
}

function runCommand(input: SmokeCommand): Promise<{
  code: number;
  durationMs: number;
  name: string;
  output: string;
}> {
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const child = spawn(input.command, {
      cwd: input.cwd,
      env: {
        ...process.env,
        FORCE_COLOR: "0"
      },
      shell: true
    });

    let output = "";

    child.stdout.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      output += chunk.toString();
    });
    child.on("close", (code) => {
      resolve({
        code: code ?? 1,
        durationMs: Date.now() - startedAt,
        name: input.name,
        output
      });
    });
  });
}

async function main() {
  const root = process.cwd();
  const outputPath =
    parseFlag("--output") ??
    resolve(root, "artifacts", "release", "smoke-summary.json");
  const commands: SmokeCommand[] = [
    { command: "pnpm lint", cwd: root, name: "lint" },
    { command: "pnpm typecheck", cwd: root, name: "typecheck" },
    { command: "pnpm test", cwd: root, name: "unit-and-integration" },
    { command: "pnpm release:migrate -- --dry-run", cwd: root, name: "release-migration-dry-run" },
    { command: "pnpm privacy:verify", cwd: root, name: "privacy-anonymization" },
    { command: "pnpm test:e2e:release", cwd: root, name: "playwright-release" }
  ];

  const results = [];
  for (const command of commands) {
    results.push(await runCommand(command));
  }

  const report = {
    checkedAt: new Date().toISOString(),
    commands: results.map((result) => ({
      code: result.code,
      durationMs: result.durationMs,
      name: result.name
    })),
    ok: results.every((result) => result.code === 0)
  };

  const humanSummary = [
    `Smoke executed at ${report.checkedAt}`,
    ...results.map(
      (result) =>
        `${result.name}: ${result.code === 0 ? "PASS" : "FAIL"} (${result.durationMs}ms)`
    )
  ].join("\n");

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(report, null, 2), "utf8");
  await writeFile(outputPath.replace(/\.json$/i, ".txt"), humanSummary, "utf8");

  console.log(humanSummary);

  if (!report.ok) {
    process.exitCode = 1;
  }
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

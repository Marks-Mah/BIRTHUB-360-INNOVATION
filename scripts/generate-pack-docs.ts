import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { isInstallableManifest, loadManifestCatalog } from "@birthub/agents-core";

function toDocSlug(agentId: string): string {
  return agentId.replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
}

function extractPromptSection(prompt: string, heading: string): string {
  const sectionPattern = new RegExp(
    `(?:^|\\n)${heading}\\n([\\s\\S]*?)(?=\\n[A-Z][A-Z\\s]+\\n|$)`,
    "u"
  );
  const match = prompt.match(sectionPattern);
  return match?.[1]?.trim() ?? "";
}

function toBulletList(block: string): string[] {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
}

async function main(): Promise<void> {
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
  const root = path.resolve(scriptsDir, "..");
  const catalogDir = path.join(root, "packages", "agent-packs");
  const outputDir = path.join(root, "docs", "agent-packs");

  const catalog = await loadManifestCatalog(catalogDir);
  await mkdir(outputDir, { recursive: true });

  for (const entry of catalog) {
    const { manifest } = entry;
    const outputPath = path.join(outputDir, `${toDocSlug(manifest.agent.id)}.mdx`);
    const guardrails = toBulletList(extractPromptSection(manifest.agent.prompt, "GUARDRAILS"));
    const learningContract = toBulletList(extractPromptSection(manifest.agent.prompt, "APRENDIZADO COMPARTILHADO"));
    const operatingReasoning = toBulletList(
      extractPromptSection(manifest.agent.prompt, "RACIOCINIO OPERACIONAL ESPERADO")
    );
    const autonomousMode = toBulletList(extractPromptSection(manifest.agent.prompt, "MODO DE OPERACAO AUTONOMA"));
    const monitoringCadence = toBulletList(
      extractPromptSection(manifest.agent.prompt, "ROTINA DE MONITORAMENTO E ANTECIPACAO")
    );
    const priorityCriteria = toBulletList(
      extractPromptSection(manifest.agent.prompt, "CRITERIOS DE PRIORIZACAO")
    );
    const escalationCriteria = toBulletList(
      extractPromptSection(manifest.agent.prompt, "CRITERIOS DE ESCALACAO")
    );
    const outputFormat = extractPromptSection(manifest.agent.prompt, "FORMATO DE SAIDA");
    const installable = isInstallableManifest(manifest);

    const content = [
      `# ${manifest.agent.name}`,
      "",
      manifest.agent.description,
      "",
      "## Collection Contract",
      `- installable: ${installable ? "yes" : "no"}`,
      `- kind: ${manifest.agent.kind}`,
      `- version: ${manifest.agent.version}`,
      "",
      "## Keywords",
      ...manifest.keywords.map((keyword) => `- ${keyword}`),
      "",
      "## Operational Loop",
      "1. Context intake",
      "2. Shared tenant learning lookup",
      "3. Planning and governed execution",
      "4. Structured response generation",
      "5. Shared learning publication",
      "",
      "## Operating Reasoning",
      ...(operatingReasoning.length > 0
        ? operatingReasoning.map((item) => `- ${item}`)
        : ["- No operating reasoning extracted from prompt."]),
      "",
      "## Autonomous Mode",
      ...(autonomousMode.length > 0
        ? autonomousMode.map((item) => `- ${item}`)
        : ["- No autonomous operating mode extracted from prompt."]),
      "",
      "## Monitoring And Anticipation",
      ...(monitoringCadence.length > 0
        ? monitoringCadence.map((item) => `- ${item}`)
        : ["- No monitoring cadence extracted from prompt."]),
      "",
      "## Prioritization Criteria",
      ...(priorityCriteria.length > 0
        ? priorityCriteria.map((item) => `- ${item}`)
        : ["- No prioritization criteria extracted from prompt."]),
      "",
      "## Escalation Criteria",
      ...(escalationCriteria.length > 0
        ? escalationCriteria.map((item) => `- ${item}`)
        : ["- No escalation criteria extracted from prompt."]),
      "",
      "## Guardrails",
      ...(guardrails.length > 0 ? guardrails.map((item) => `- ${item}`) : ["- No guardrails extracted from prompt."]),
      "",
      "## Shared Learning Contract",
      ...(learningContract.length > 0
        ? learningContract.map((item) => `- ${item}`)
        : ["- No shared learning contract extracted from prompt."]),
      "",
      "## Output Contract",
      outputFormat || "No explicit output contract extracted from prompt.",
      "",
      "## Prompt",
      manifest.agent.prompt,
      "",
      "## Tags",
      `- domain: ${manifest.tags.domain.join(", ")}`,
      `- level: ${manifest.tags.level.join(", ")}`,
      `- persona: ${manifest.tags.persona.join(", ")}`,
      `- use-case: ${manifest.tags["use-case"].join(", ")}`,
      `- industry: ${manifest.tags.industry.join(", ")}`,
      "",
      "## Skills",
      ...manifest.skills.map((skill) => `- **${skill.name}**: ${skill.description}`),
      "",
      "## Tools",
      ...manifest.tools.map((tool) => `- **${tool.name}**: ${tool.description}`),
      "",
      "## Policies",
      ...manifest.policies.map(
        (policy) => `- **${policy.name}** (${policy.effect}): ${policy.actions.join(", ")}`
      ),
      "",
      "## Changelog",
      ...(manifest.agent.changelog.length > 0
        ? manifest.agent.changelog.map((line) => `- ${line}`)
        : ["- No changelog entries."])
    ].join("\n");

    await writeFile(outputPath, `${content}\n`, "utf8");
  }

  console.log(`Generated docs for ${catalog.length} agents in docs/agent-packs.`);
}

void main();

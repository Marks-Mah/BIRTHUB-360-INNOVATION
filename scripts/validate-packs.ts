import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  AgentManifestParseError,
  isInstallableManifest,
  parseAgentManifest,
  type AgentManifest
} from "@birthub/agents-core";

const OFFICIAL_COLLECTION_DESCRIPTOR_ID = "corporate-v1-catalog";
const OFFICIAL_INSTALLABLE_COUNT = 42;
const OFFICIAL_TOTAL_COUNT = 43;
const REQUIRED_PROMPT_SECTIONS = [
  "IDENTIDADE E MISSAO",
  "QUANDO ACIONAR",
  "ENTRADAS OBRIGATORIAS",
  "RACIOCINIO OPERACIONAL ESPERADO",
  "MODO DE OPERACAO AUTONOMA",
  "ROTINA DE MONITORAMENTO E ANTECIPACAO",
  "CRITERIOS DE PRIORIZACAO",
  "CRITERIOS DE ESCALACAO",
  "OBJETIVOS PRIORITARIOS",
  "FERRAMENTAS ESPERADAS",
  "SAIDAS OBRIGATORIAS",
  "GUARDRAILS",
  "CHECKLIST DE QUALIDADE",
  "APRENDIZADO COMPARTILHADO",
  "FORMATO DE SAIDA"
] as const;
const SHARED_LEARNING_CLAUSE = "Todo agente aprende com todo agente.";
const AUTONOMOUS_OPERATION_CLAUSE = "operar de forma autonoma dentro do escopo permitido";
const PREVENTIVE_ALERT_CLAUSE = "nunca esperar um risco relevante virar incidente para alertar";

async function findManifestFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const manifestFiles: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      manifestFiles.push(...(await findManifestFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name === "manifest.json") {
      manifestFiles.push(entryPath);
    }
  }

  return manifestFiles;
}

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function validatePromptSections(manifest: AgentManifest): string[] {
  const issues: string[] = [];
  const prompt = manifest.agent.prompt;

  for (const section of REQUIRED_PROMPT_SECTIONS) {
    if (!prompt.includes(section)) {
      issues.push(`Missing prompt section '${section}'.`);
    }
  }

  if (!prompt.includes(SHARED_LEARNING_CLAUSE)) {
    issues.push("Missing cross-agent shared learning clause.");
  }

  if (!prompt.toLowerCase().includes(AUTONOMOUS_OPERATION_CLAUSE)) {
    issues.push("Missing explicit autonomous operating clause.");
  }

  if (!prompt.toLowerCase().includes(PREVENTIVE_ALERT_CLAUSE)) {
    issues.push("Missing preventive escalation clause.");
  }

  return issues;
}

function validateKeywords(manifest: AgentManifest): string[] {
  const issues: string[] = [];
  const keywords = manifest.keywords;
  const normalizedKeywords = keywords.map(normalizeToken);
  const uniqueKeywords = new Set(normalizedKeywords);

  if (keywords.length < 8) {
    issues.push("Expected at least 8 curated keywords for installable agents.");
  }

  if (uniqueKeywords.size !== normalizedKeywords.length) {
    issues.push("Keywords must be unique within each manifest.");
  }

  if (normalizedKeywords.some((keyword) => keyword.length < 3)) {
    issues.push("Keywords must contain meaningful terms with at least 3 characters.");
  }

  return issues;
}

function validateContractCoherence(manifest: AgentManifest): string[] {
  const issues: string[] = [];
  const prefix = `${manifest.agent.id}.`;
  const prompt = manifest.agent.prompt;
  const policyActions = new Set(manifest.policies.flatMap((policy) => policy.actions));
  const toolNames = manifest.tools.map((tool) => tool.name.toLowerCase());

  for (const skill of manifest.skills) {
    if (!skill.id.startsWith(prefix)) {
      issues.push(`Skill id '${skill.id}' must start with '${prefix}'.`);
    }
  }

  for (const tool of manifest.tools) {
    if (!tool.id.startsWith(prefix)) {
      issues.push(`Tool id '${tool.id}' must start with '${prefix}'.`);
    }

    if (!prompt.toLowerCase().includes(tool.name.toLowerCase())) {
      issues.push(`Prompt must reference tool '${tool.name}' for operational coherence.`);
    }
  }

  for (const policy of manifest.policies) {
    if (!policy.id.startsWith(prefix)) {
      issues.push(`Policy id '${policy.id}' must start with '${prefix}'.`);
    }
  }

  if (!policyActions.has("memory:read") || !policyActions.has("memory:write")) {
    issues.push("Policies must allow governed memory read/write operations.");
  }

  if (!policyActions.has("learning:read") || !policyActions.has("learning:write")) {
    issues.push("Policies must allow governed shared learning read/write operations.");
  }

  const requiresApproval =
    toolNames.some((toolName) => /approval|email|whatsapp|calendar|crm|sync|notification/.test(toolName)) ||
    /aprova|approval|autoriz/i.test(prompt);

  if (requiresApproval && !policyActions.has("approval:request")) {
    issues.push("Policies must include 'approval:request' for approval-sensitive tools or prompts.");
  }

  return issues;
}

async function main(): Promise<void> {
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = path.resolve(scriptsDir, "..");
  const catalogRoot = path.join(workspaceRoot, "packages", "agent-packs");
  const officialCollectionRoot = path.join(catalogRoot, "corporate-v1");
  const manifestFiles = await findManifestFiles(catalogRoot);

  if (manifestFiles.length === 0) {
    throw new Error("No manifest files found under packages/agent-packs.");
  }

  const failures: Array<{ filePath: string; issues: string[] }> = [];
  const validatedEntries: Array<{ filePath: string; manifest: AgentManifest }> = [];

  for (const filePath of manifestFiles) {
    const fileContent = await readFile(filePath, "utf8");

    try {
      const manifest = parseAgentManifest(JSON.parse(fileContent) as unknown);
      validatedEntries.push({
        filePath,
        manifest
      });
    } catch (error) {
      if (error instanceof AgentManifestParseError) {
        failures.push({
          filePath,
          issues: error.issues
        });
      } else {
        failures.push({
          filePath,
          issues: [error instanceof Error ? error.message : "Unknown parser error"]
        });
      }
    }
  }

  if (failures.length === 0) {
    const manifestPathsById = new Map<string, string>();

    for (const entry of validatedEntries) {
      const duplicatePath = manifestPathsById.get(entry.manifest.agent.id);

      if (duplicatePath) {
        failures.push({
          filePath: entry.filePath,
          issues: [`Duplicate manifest id '${entry.manifest.agent.id}' also found in ${duplicatePath}.`]
        });
        continue;
      }

      manifestPathsById.set(entry.manifest.agent.id, entry.filePath);

      if (!isInstallableManifest(entry.manifest)) {
        continue;
      }

      const issues = [
        ...validatePromptSections(entry.manifest),
        ...validateKeywords(entry.manifest),
        ...validateContractCoherence(entry.manifest)
      ];

      if (issues.length > 0) {
        failures.push({
          filePath: entry.filePath,
          issues
        });
      }
    }

    const officialEntries = validatedEntries.filter((entry) => entry.filePath.startsWith(officialCollectionRoot));
    const installableOfficialEntries = officialEntries.filter((entry) => isInstallableManifest(entry.manifest));
    const catalogOfficialEntries = officialEntries.filter((entry) => !isInstallableManifest(entry.manifest));

    if (officialEntries.length !== OFFICIAL_TOTAL_COUNT) {
      failures.push({
        filePath: officialCollectionRoot,
        issues: [
          `Expected ${OFFICIAL_TOTAL_COUNT} total official manifests, found ${officialEntries.length}.`
        ]
      });
    }

    if (installableOfficialEntries.length !== OFFICIAL_INSTALLABLE_COUNT) {
      failures.push({
        filePath: officialCollectionRoot,
        issues: [
          `Expected ${OFFICIAL_INSTALLABLE_COUNT} installable official agents, found ${installableOfficialEntries.length}.`
        ]
      });
    }

    if (
      catalogOfficialEntries.length !== 1 ||
      catalogOfficialEntries[0]?.manifest.agent.id !== OFFICIAL_COLLECTION_DESCRIPTOR_ID
    ) {
      failures.push({
        filePath: officialCollectionRoot,
        issues: [
          `Expected exactly one official collection descriptor with id '${OFFICIAL_COLLECTION_DESCRIPTOR_ID}'.`
        ]
      });
    }
  }

  if (failures.length > 0) {
    for (const failure of failures) {
      console.error(`\n[INVALID MANIFEST] ${failure.filePath}`);
      for (const issue of failure.issues) {
        console.error(`- ${issue}`);
      }
    }

    process.exitCode = 1;
    return;
  }

  console.log(`Validated ${manifestFiles.length} manifests successfully.`);
}

void main();

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { JSDOM } from "jsdom";

interface HtmlAgentRecord {
  code: string;
  category: string;
  title: string;
  mission: string;
  whenToUse: string[];
  expectedTools: string[];
  inputs: string[];
  outputs: string[];
  guardrails: string[];
  promptBase: string;
  promptSections: {
    mission: string;
    objectives: string[];
    rules: string[];
    outputFormat: string;
  };
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\r/g, "").replace(/\u00a0/g, " ").replace(/[ \t]+\n/g, "\n").trim();
}

function readList(section: Element | null): string[] {
  if (!section) {
    return [];
  }

  return Array.from(section.querySelectorAll("li"))
    .map((item) => normalizeWhitespace(item.textContent ?? ""))
    .filter(Boolean);
}

function readPanelText(section: Element, headingText: string): string {
  const panels = Array.from(section.querySelectorAll(".panel"));
  const match = panels.find((panel) => normalizeWhitespace(panel.querySelector("h3")?.textContent ?? "") === headingText);
  return normalizeWhitespace(match?.querySelector("p")?.textContent ?? "");
}

function readPanel(section: Element, headingText: string): Element | null {
  const panels = Array.from(section.querySelectorAll(".panel"));
  return panels.find((panel) => normalizeWhitespace(panel.querySelector("h3")?.textContent ?? "") === headingText) ?? null;
}

function extractPromptSection(prompt: string, labels: string[]): string {
  const lines = normalizeWhitespace(prompt).split("\n");
  const upperLabels = new Set(labels.map((label) => label.toUpperCase()));
  const collected: string[] = [];
  let currentLabel = "";

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const upperLine = line.toUpperCase();

    if (upperLabels.has(upperLine)) {
      currentLabel = upperLine;
      continue;
    }

    if (
      currentLabel &&
      line &&
      !upperLabels.has(upperLine) &&
      !["MISSAO", "MISSAO", "OBJETIVOS", "TAREFAS", "REGRAS", "FORMATO DE SAIDA", "FORMATO DE SAÍDA"].includes(upperLine)
    ) {
      collected.push(rawLine);
      continue;
    }

    if (currentLabel && ["MISSAO", "MISSÃO", "OBJETIVOS", "TAREFAS", "REGRAS", "FORMATO DE SAIDA", "FORMATO DE SAÍDA"].includes(upperLine)) {
      break;
    }
  }

  return normalizeWhitespace(collected.join("\n"));
}

function extractBulletLines(block: string): string[] {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => line.replace(/^-+\s*/, "").trim())
    .filter(Boolean);
}

function parsePrompt(prompt: string) {
  const mission = extractPromptSection(prompt, ["MISSAO", "MISSÃO"]);
  const objectivesBlock = extractPromptSection(prompt, ["OBJETIVOS", "TAREFAS"]);
  const rulesBlock = extractPromptSection(prompt, ["REGRAS"]);
  const outputFormat = extractPromptSection(prompt, ["FORMATO DE SAIDA", "FORMATO DE SAÍDA"]);

  return {
    mission,
    objectives: extractBulletLines(objectivesBlock),
    rules: extractBulletLines(rulesBlock),
    outputFormat
  };
}

async function main(): Promise<void> {
  const scriptsDir = path.dirname(fileURLToPath(import.meta.url));
  const workspaceRoot = path.resolve(scriptsDir, "..");
  const inputPath =
    process.argv[2] ??
    process.env.BIRTHHUB_HTML_PATH ??
    "C:/Users/marce/Downloads/BirthHub_30_Agentes_Prompts_Mestre.html";
  const outputPath = path.join(
    workspaceRoot,
    "packages",
    "agent-packs",
    "corporate-v1",
    "source",
    "birthhub-html-agents.json"
  );

  const html = await readFile(inputPath, "utf8");
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const sections = Array.from(document.querySelectorAll("section.agent-card[id^='A']"));

  const records: HtmlAgentRecord[] = sections.map((section) => {
    const code = section.getAttribute("id") ?? "";
    const titleText = normalizeWhitespace(section.querySelector("h2")?.textContent ?? "");
    const title = titleText.replace(/^[A-Z0-9]+\s+·\s+/u, "").trim();
    const prompt = normalizeWhitespace(
      section.querySelector<HTMLPreElement>(`#prompt-${code}`)?.textContent ?? ""
    );

    return {
      category: normalizeWhitespace(section.querySelector(".pill")?.textContent ?? ""),
      code,
      expectedTools: readList(readPanel(section, "Ferramentas esperadas")),
      guardrails: readList(readPanel(section, "Guardrails")),
      inputs: readList(readPanel(section, "Entradas")),
      mission: normalizeWhitespace(section.querySelector(".mission")?.textContent ?? ""),
      outputs: readList(readPanel(section, "Saídas")),
      promptBase: prompt,
      promptSections: parsePrompt(prompt),
      title,
      whenToUse: [
        readPanelText(section, "Quando acionar")
      ].filter(Boolean)
    };
  });

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(records, null, 2)}\n`, "utf8");

  console.log(`Synced ${records.length} BirthHub HTML agents to ${outputPath}`);
}

void main();

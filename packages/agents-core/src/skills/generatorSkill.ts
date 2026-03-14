import { z } from "zod";

export const generatorInputSchema = z.object({
  brief: z.string().min(10),
  format: z.enum(["markdown", "html"]).default("markdown"),
  tone: z.string().min(2).default("executive")
});

export const generatorOutputSchema = z.object({
  artifact: z.string().min(30),
  format: z.enum(["markdown", "html"])
});

export type GeneratorInput = z.infer<typeof generatorInputSchema>;
export type GeneratorOutput = z.infer<typeof generatorOutputSchema>;

function createMarkdownArtifact(input: GeneratorInput): string {
  return [
    `# Entrega Gerada`,
    "",
    `## Tom`,
    `${input.tone}`,
    "",
    "## Brief",
    input.brief,
    "",
    "## Proposta",
    "1. Diagnostico inicial",
    "2. Plano de execucao",
    "3. Metricas de sucesso"
  ].join("\n");
}

function createHtmlArtifact(input: GeneratorInput): string {
  return `<article><h1>Entrega Gerada</h1><h2>Tom</h2><p>${input.tone}</p><h2>Brief</h2><p>${input.brief}</p><h2>Proposta</h2><ol><li>Diagnostico inicial</li><li>Plano de execucao</li><li>Metricas de sucesso</li></ol></article>`;
}

export async function runGeneratorSkill(input: GeneratorInput): Promise<GeneratorOutput> {
  const artifact = input.format === "html" ? createHtmlArtifact(input) : createMarkdownArtifact(input);

  return generatorOutputSchema.parse({
    artifact,
    format: input.format
  });
}

export const generatorSkillTemplate = {
  id: "template.generator.v1",
  inputSchema: generatorInputSchema,
  outputSchema: generatorOutputSchema,
  run: runGeneratorSkill
};

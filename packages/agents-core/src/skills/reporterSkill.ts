import { z } from "zod";

export const reporterInputSchema = z.object({
  format: z.enum(["markdown", "pdf"]).default("markdown"),
  metrics: z.array(
    z.object({
      label: z.string().min(1),
      value: z.number()
    })
  )
});

export const reporterOutputSchema = z.object({
  content: z.string().min(10),
  format: z.enum(["markdown", "pdf"])
});

export type ReporterInput = z.infer<typeof reporterInputSchema>;
export type ReporterOutput = z.infer<typeof reporterOutputSchema>;

export async function runReporterSkill(input: ReporterInput): Promise<ReporterOutput> {
  const rows = input.metrics.map((metric) => `- ${metric.label}: ${metric.value}`).join("\n");

  const markdown = [
    "# Relatorio Executivo",
    "",
    "## Resumo de Metricas",
    rows,
    "",
    "## Observacoes",
    "- Priorizar indicadores abaixo da meta.",
    "- Revisar risco de budget em agentes com alto consumo."
  ].join("\n");

  if (input.format === "pdf") {
    return reporterOutputSchema.parse({
      content: `PDF_BINARY_PLACEHOLDER::${Buffer.from(markdown, "utf8").toString("base64")}`,
      format: "pdf"
    });
  }

  return reporterOutputSchema.parse({
    content: markdown,
    format: "markdown"
  });
}

export const reporterSkillTemplate = {
  id: "template.reporter.v1",
  inputSchema: reporterInputSchema,
  outputSchema: reporterOutputSchema,
  run: runReporterSkill
};

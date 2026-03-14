import { z } from "zod";

export const analyzerInputSchema = z.object({
  context: z.string().min(10),
  objective: z.string().min(3)
});

export const analyzerOutputSchema = z.object({
  insights: z.array(z.string().min(3)).min(1),
  score: z.number().min(0).max(100)
});

export type AnalyzerInput = z.infer<typeof analyzerInputSchema>;
export type AnalyzerOutput = z.infer<typeof analyzerOutputSchema>;

export async function runAnalyzerSkill(input: AnalyzerInput): Promise<AnalyzerOutput> {
  const normalizedContext = input.context.toLowerCase();
  const positiveSignals = ["growth", "win", "healthy", "efficient", "improve"];

  const hits = positiveSignals.filter((signal) => normalizedContext.includes(signal)).length;
  const score = Math.min(100, 40 + hits * 12);

  return analyzerOutputSchema.parse({
    insights: [
      `Objetivo analisado: ${input.objective}.`,
      `Sinais positivos identificados: ${hits}.`,
      "Priorize a execucao de maior impacto no curto prazo."
    ],
    score
  });
}

export const analyzerSkillTemplate = {
  id: "template.analyzer.v1",
  inputSchema: analyzerInputSchema,
  outputSchema: analyzerOutputSchema,
  run: runAnalyzerSkill
};

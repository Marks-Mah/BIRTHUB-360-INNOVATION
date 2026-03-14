import { z } from "zod";

const kpiPointSchema = z.object({
  timestamp: z.string().datetime(),
  value: z.number()
});

export const monitorInputSchema = z.object({
  kpiName: z.string().min(2),
  points: z.array(kpiPointSchema).min(3)
});

export const monitorOutputSchema = z.object({
  anomalies: z.array(
    z.object({
      severity: z.enum(["low", "medium", "high"]),
      timestamp: z.string().datetime(),
      value: z.number()
    })
  )
});

export type MonitorInput = z.infer<typeof monitorInputSchema>;
export type MonitorOutput = z.infer<typeof monitorOutputSchema>;

function computeStdDev(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

function classifySeverity(deviation: number): "low" | "medium" | "high" {
  if (deviation >= 3) {
    return "high";
  }

  if (deviation >= 2) {
    return "medium";
  }

  return "low";
}

export async function runMonitorSkill(input: MonitorInput): Promise<MonitorOutput> {
  const values = input.points.map((point) => point.value);
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const stdDev = computeStdDev(values) || 1;

  const anomalies = input.points
    .map((point) => {
      const zScore = Math.abs((point.value - mean) / stdDev);

      if (zScore < 2) {
        return null;
      }

      return {
        severity: classifySeverity(zScore),
        timestamp: point.timestamp,
        value: point.value
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return monitorOutputSchema.parse({ anomalies });
}

export const monitorSkillTemplate = {
  id: "template.monitor.v1",
  inputSchema: monitorInputSchema,
  outputSchema: monitorOutputSchema,
  run: runMonitorSkill
};

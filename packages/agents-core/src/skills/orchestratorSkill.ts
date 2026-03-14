import { z } from "zod";

export const orchestratorInputSchema = z.object({
  objective: z.string().min(5),
  availableAgents: z.array(z.string().min(1)).min(1),
  maxSteps: z.number().int().positive().max(20).default(8)
});

export const orchestratorOutputSchema = z.object({
  plan: z.array(
    z.object({
      reason: z.string().min(3),
      sequence: z.number().int().positive(),
      subAgentId: z.string().min(1)
    })
  ),
  queueAgentIds: z.array(z.string().min(1)).min(1)
});

export type OrchestratorInput = z.infer<typeof orchestratorInputSchema>;
export type OrchestratorOutput = z.infer<typeof orchestratorOutputSchema>;

export async function runOrchestratorSkill(input: OrchestratorInput): Promise<OrchestratorOutput> {
  const selectedAgents = input.availableAgents.slice(0, input.maxSteps);

  const plan = selectedAgents.map((agentId, index) => ({
    reason: `Executar ${agentId} para avancar o objetivo: ${input.objective}`,
    sequence: index + 1,
    subAgentId: agentId
  }));

  return orchestratorOutputSchema.parse({
    plan,
    queueAgentIds: selectedAgents
  });
}

export const orchestratorSkillTemplate = {
  id: "template.orchestrator.v1",
  inputSchema: orchestratorInputSchema,
  outputSchema: orchestratorOutputSchema,
  run: runOrchestratorSkill
};

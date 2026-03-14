import { createHash } from "node:crypto";

import type { AgentManifest } from "../manifest/schema.js";

export interface DryRunResult {
  logs: string[];
  output: string;
  outputHash: string;
}

export function computeOutputHash(output: string): string {
  return createHash("sha256").update(output, "utf8").digest("hex");
}

export async function runAgentDryRun(manifest: AgentManifest): Promise<DryRunResult> {
  const logs = [
    `Simulating agent ${manifest.agent.id} (${manifest.agent.name})`,
    "Simulating LLM call...",
    "Returning MOCK_DATA"
  ];

  const output = JSON.stringify(
    {
      agentId: manifest.agent.id,
      message: "MOCK_DATA",
      tools: manifest.tools.map((tool) => tool.id)
    },
    null,
    2
  );

  return {
    logs,
    output,
    outputHash: computeOutputHash(output)
  };
}

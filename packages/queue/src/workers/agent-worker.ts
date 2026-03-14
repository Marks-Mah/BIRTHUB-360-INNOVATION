import { BaseWorker } from "./base-worker";

export interface AgentJobPayload { agentId: string; input: Record<string, unknown>; shouldFail?: boolean }

export class AgentWorker extends BaseWorker<AgentJobPayload> {
  protected async process(payload: AgentJobPayload): Promise<void> {
    if (payload.shouldFail) throw new Error("AGENT_FAILED");
  }
}

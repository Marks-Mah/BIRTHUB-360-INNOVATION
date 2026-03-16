import { BaseWorker } from "./base-worker";
export class AgentWorker extends BaseWorker {
    async process(payload) {
        if (payload.shouldFail)
            throw new Error("AGENT_FAILED");
    }
}

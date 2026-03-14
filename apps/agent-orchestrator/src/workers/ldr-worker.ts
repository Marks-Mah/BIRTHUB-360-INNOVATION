import { prisma } from '@birthub/db';
import { LLMClient } from '@birthub/llm-client';
import { createWorker } from '@birthub/queue';
import { QueueName } from '@birthub/shared-types';
import type { Job } from 'bullmq';
import { LDRAgent } from '../agents/ldr-agent.js';

const llm = new LLMClient({
  providers: {
    openai: process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : undefined,
    anthropic: process.env.ANTHROPIC_API_KEY ? { apiKey: process.env.ANTHROPIC_API_KEY } : undefined,
    gemini: process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : undefined,
  },
});

const agent = new LDRAgent(llm, prisma);

createWorker(QueueName.LDR_QUEUE, async (job: Job<{ leadId: string }>) => {
  await agent.qualifyLead(job.data.leadId);
});

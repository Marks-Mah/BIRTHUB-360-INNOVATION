import { prisma } from '@birthub/db';
import { LLMClient } from '@birthub/llm-client';
import { createWorker } from '@birthub/queue';
import { QueueName } from '@birthub/shared-types';
import type { Job } from 'bullmq';
import { SDRAgent } from '../agents/sdr-agent.js';

const llm = new LLMClient({
  providers: {
    openai: process.env.OPENAI_API_KEY ? { apiKey: process.env.OPENAI_API_KEY } : undefined,
    anthropic: process.env.ANTHROPIC_API_KEY ? { apiKey: process.env.ANTHROPIC_API_KEY } : undefined,
    gemini: process.env.GEMINI_API_KEY ? { apiKey: process.env.GEMINI_API_KEY } : undefined,
  },
});

const agent = new SDRAgent(llm, prisma);

createWorker(QueueName.SDR_QUEUE, async (job: Job<any>) => {
  if (job.name === 'sdr.step') {
    await agent.executeEmailStep(job.data.activityId);
    return;
  }

  if (job.name === 'lead.qualified') {
    await agent.createCadence(job.data.leadId, {
      value: job.data.value,
      painPoints: job.data.painPoints,
      product: job.data.product,
    });
    return;
  }

  if (job.name === 'sdr.email.tracking') {
    return;
  }

  throw new Error(`Unsupported SDR job: ${job.name}`);
});

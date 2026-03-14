import { z } from "zod";

import { workflowCanvasSchema } from "@birthub/workflows-core";

export const workflowStateSchema = z.enum(["ARCHIVED", "DRAFT", "PUBLISHED"]);

export const workflowCreateSchema = z
  .object({
    canvas: workflowCanvasSchema,
    cronExpression: z.string().optional(),
    description: z.string().max(400).optional(),
    eventTopic: z.string().min(1).optional(),
    maxDepth: z.number().int().min(1).max(50).default(50),
    name: z.string().min(1).max(120),
    status: workflowStateSchema.default("DRAFT"),
    triggerConfig: z.record(z.string(), z.unknown()).default({}),
    triggerType: z.enum(["CRON", "EVENT", "MANUAL", "WEBHOOK"]).default("MANUAL")
  })
  .strict();

export const workflowUpdateSchema = workflowCreateSchema.partial().strict();

export const workflowRunSchema = z
  .object({
    async: z.boolean().default(true),
    payload: z.record(z.string(), z.unknown()).default({})
  })
  .strict();

export type WorkflowCreateInput = z.infer<typeof workflowCreateSchema>;
export type WorkflowRunInput = z.infer<typeof workflowRunSchema>;
export type WorkflowUpdateInput = z.infer<typeof workflowUpdateSchema>;


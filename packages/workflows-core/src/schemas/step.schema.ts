import { z } from "zod";

const interpolationGuard = (value: string) => !value.includes("${");

const interpolationString = z
  .string()
  .min(1)
  .refine((value) => interpolationGuard(value), "Template literals are not allowed in workflow config.");
const interpolationUrlString = z
  .string()
  .url()
  .refine((value) => interpolationGuard(value), "Template literals are not allowed in workflow config.");

const triggerWebhookSchema = z
  .object({
    config: z
      .object({
        method: z.enum(["POST"]).default("POST"),
        path: z.string().min(1)
      })
      .strict(),
    isTrigger: z.literal(true).default(true),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("TRIGGER_WEBHOOK")
  })
  .strict();

const triggerCronSchema = z
  .object({
    config: z
      .object({
        cron: z.string().min(5),
        timezone: z.string().min(1).default("UTC")
      })
      .strict(),
    isTrigger: z.literal(true).default(true),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("TRIGGER_CRON")
  })
  .strict();

const triggerEventSchema = z
  .object({
    config: z
      .object({
        topic: z.string().min(1)
      })
      .strict(),
    isTrigger: z.literal(true).default(true),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("TRIGGER_EVENT")
  })
  .strict();

const delaySchema = z
  .object({
    config: z
      .object({
        duration_ms: z.number().int().positive()
      })
      .strict(),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("DELAY")
  })
  .strict();

const httpRequestSchema = z
  .object({
    config: z
      .object({
        auth: z
          .object({
            bearer: interpolationString.optional()
          })
          .strict()
          .optional(),
        body: z.unknown().optional(),
        headers: z.record(z.string(), interpolationString).default({}),
        method: z.enum(["DELETE", "GET", "PATCH", "POST", "PUT"]).default("GET"),
        timeout_ms: z.number().int().positive().max(10_000).default(2500),
        url: interpolationUrlString,
        webhookSecret: interpolationString.optional()
      })
      .strict(),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("HTTP_REQUEST")
  })
  .strict();

const conditionSchema = z
  .object({
    config: z
      .object({
        operator: z.enum(["!=", "<", "<=", "==", ">", ">="]),
        path: z.string().min(1),
        value: z.union([z.boolean(), z.number(), z.string()])
      })
      .strict(),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("CONDITION")
  })
  .strict();

const codeSchema = z
  .object({
    config: z
      .object({
        timeout_ms: z.number().int().positive().max(1000).default(1000),
        source: z.string().min(1)
      })
      .strict(),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("CODE")
  })
  .strict();

const transformerSchema = z
  .object({
    config: z
      .object({
        filter: z.string().optional(),
        map: z.record(z.string(), z.unknown()).optional(),
        reduce: z.string().optional(),
        sourcePath: z.string().optional()
      })
      .strict(),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("TRANSFORMER")
  })
  .strict();

const notificationSchema = z
  .object({
    config: z
      .object({
        channel: z.enum(["email", "inapp"]),
        message: interpolationString,
        batchKey: z.string().min(1).optional(),
        batchWindowMs: z.number().int().positive().max(60_000).default(5000),
        to: interpolationString
      })
      .strict(),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("SEND_NOTIFICATION")
  })
  .strict();

const agentExecuteSchema = z
  .object({
    config: z
      .object({
        agentId: z.string().min(1),
        input: z.record(z.string(), z.unknown()).default({}),
        onError: z.enum(["continue", "stop"]).default("stop")
      })
      .strict(),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("AGENT_EXECUTE")
  })
  .strict();

const aiTextExtractSchema = z
  .object({
    config: z
      .object({
        fields: z.array(z.string().min(1)).min(1),
        text: interpolationString
      })
      .strict(),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("AI_TEXT_EXTRACT")
  })
  .strict();

export const stepSchema = z.discriminatedUnion("type", [
  triggerWebhookSchema,
  triggerCronSchema,
  triggerEventSchema,
  delaySchema,
  httpRequestSchema,
  conditionSchema,
  codeSchema,
  transformerSchema,
  notificationSchema,
  agentExecuteSchema,
  aiTextExtractSchema
]);

export const workflowCanvasSchema = z
  .object({
    steps: z.array(stepSchema).min(1),
    transitions: z
      .array(
        z
          .object({
            route: z
              .enum(["ALWAYS", "IF_TRUE", "IF_FALSE", "ON_FAILURE", "ON_SUCCESS", "FALLBACK"])
              .default("ALWAYS"),
            source: z.string().min(1),
            target: z.string().min(1)
          })
          .strict()
      )
      .default([])
  })
  .strict();

export type StepDefinition = z.infer<typeof stepSchema>;
export type WorkflowCanvas = z.infer<typeof workflowCanvasSchema>;

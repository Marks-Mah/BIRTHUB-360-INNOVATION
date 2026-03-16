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

const agentHandoffSchema = z
  .object({
    config: z
      .object({
        context: z.record(z.string(), z.unknown()).default({}),
        correlationId: interpolationString.optional(),
        sourceAgentId: z.string().min(1),
        summary: interpolationString,
        targetAgentId: z.string().min(1),
        threadId: z.string().min(1).optional()
      })
      .strict(),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("AGENT_HANDOFF")
  })
  .strict();

const crmUpsertSchema = z
  .object({
    config: z
      .object({
        connectorAccountId: z.string().min(1).optional(),
        objectType: z.enum(["company", "contact", "deal"]),
        operation: z.enum(["upsert"]).default("upsert"),
        payload: z.record(z.string(), z.unknown()),
        provider: z.enum(["hubspot", "salesforce", "pipedrive"]).default("hubspot"),
        scope: z.string().min(1).optional()
      })
      .strict(),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("CRM_UPSERT")
  })
  .strict();

const whatsappSendSchema = z
  .object({
    config: z
      .object({
        connectorAccountId: z.string().min(1).optional(),
        message: interpolationString,
        template: interpolationString.optional(),
        threadId: z.string().min(1).optional(),
        to: interpolationString
      })
      .strict(),
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("WHATSAPP_SEND")
  })
  .strict();

const calendarEventConfigSchema = z
  .object({
    attendees: z.array(interpolationString).default([]),
    calendarId: interpolationString.optional(),
    connectorAccountId: z.string().min(1).optional(),
    description: interpolationString.optional(),
    end: interpolationString,
    start: interpolationString,
    title: interpolationString
  })
  .strict();

const googleEventSchema = z
  .object({
    config: calendarEventConfigSchema,
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("GOOGLE_EVENT")
  })
  .strict();

const msEventSchema = z
  .object({
    config: calendarEventConfigSchema,
    key: z.string().min(1),
    name: z.string().min(1),
    type: z.literal("MS_EVENT")
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
  agentHandoffSchema,
  crmUpsertSchema,
  whatsappSendSchema,
  googleEventSchema,
  msEventSchema,
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

import { z } from "zod";

const semanticVersionRegex =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;

export const SUPPORTED_AGENT_API_VERSION = "1.0.0";

export const semanticVersionSchema = z
  .string()
  .regex(semanticVersionRegex, "Expected semantic version (major.minor.patch)");

const skillReferenceSchema = z
  .object({
    id: z.string().min(1),
    source: z.string().min(1).optional(),
    version: semanticVersionSchema
  })
  .strict();

const toolReferenceSchema = z
  .object({
    id: z.string().min(1),
    maxCalls: z.number().int().positive().max(1000).default(1),
    timeoutMs: z.number().int().positive().max(300_000).default(30_000)
  })
  .strict();

const restrictionPolicySchema = z
  .object({
    allowDomains: z.array(z.string().min(1)).default([]),
    allowTools: z.array(z.string().min(1)).default([]),
    denyTools: z.array(z.string().min(1)).default([]),
    maxSteps: z.number().int().positive().max(100).default(12),
    maxTokens: z.number().int().positive().max(1_000_000).default(8_000)
  })
  .strict();

export const agentManifestSchema = z
  .object({
    apiVersion: semanticVersionSchema.default(SUPPORTED_AGENT_API_VERSION),
    version: semanticVersionSchema,
    description: z.string().min(1).max(2_000).optional(),
    name: z.string().min(1).max(120),
    system_prompt: z.string().min(1).max(10_000),
    memory_ttl: z.number().int().positive().max(31536000).default(86400),
    restrictions: restrictionPolicySchema.default({
      allowDomains: [],
      allowTools: [],
      denyTools: [],
      maxSteps: 12,
      maxTokens: 8_000
    }),
    skills: z.array(skillReferenceSchema).min(1),
    tags: z.array(z.string().min(1)).default([]),
    tools: z.array(toolReferenceSchema),
    metadata: z.record(z.string(), z.unknown()).optional()
  })
  .strict();

export type AgentManifest = z.infer<typeof agentManifestSchema>;

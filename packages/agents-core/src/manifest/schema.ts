import { z } from "zod";

export const MANIFEST_VERSION = "1.0.0" as const;

const nonEmptyString = z.string().trim().min(1);
const jsonSchemaObject = z.record(z.string(), z.unknown()).default({ type: "object" });

const tagListSchema = z.array(nonEmptyString).min(1);
const keywordListSchema = z.array(nonEmptyString).min(5);

// Default-deny governance: every manifest object schema in this module is strict.

export const manifestTagsSchema = z
  .object({
    domain: tagListSchema,
    level: tagListSchema,
    persona: tagListSchema,
    "use-case": tagListSchema,
    industry: tagListSchema
  })
  .strict();

export const skillManifestSchema = z
  .object({
    description: nonEmptyString,
    id: nonEmptyString,
    inputSchema: jsonSchemaObject,
    name: nonEmptyString,
    outputSchema: jsonSchemaObject
  })
  .strict();

export const toolManifestSchema = z
  .object({
    description: nonEmptyString,
    id: nonEmptyString,
    inputSchema: jsonSchemaObject,
    name: nonEmptyString,
    outputSchema: jsonSchemaObject,
    timeoutMs: z.number().int().positive().default(15_000)
  })
  .strict();

export const policyManifestSchema = z
  .object({
    actions: z.array(nonEmptyString).min(1),
    effect: z.enum(["allow", "deny"]),
    id: nonEmptyString,
    name: nonEmptyString
  })
  .strict();

export const agentDescriptorSchema = z
  .object({
    changelog: z.array(nonEmptyString).default([]),
    description: nonEmptyString,
    id: nonEmptyString,
    kind: z.enum(["agent", "catalog"]).default("agent"),
    name: nonEmptyString,
    prompt: nonEmptyString,
    tenantId: nonEmptyString.default("catalog"),
    version: nonEmptyString
  })
  .strict();

export const agentManifestSchema = z
  .object({
    agent: agentDescriptorSchema,
    keywords: keywordListSchema,
    manifestVersion: z.literal(MANIFEST_VERSION),
    policies: z.array(policyManifestSchema).min(1),
    skills: z.array(skillManifestSchema).min(1),
    tags: manifestTagsSchema,
    tools: z.array(toolManifestSchema).min(1)
  })
  .strict();

export type AgentManifest = z.infer<typeof agentManifestSchema>;
export type AgentManifestTags = z.infer<typeof manifestTagsSchema>;
export type AgentManifestKeywords = z.infer<typeof keywordListSchema>;

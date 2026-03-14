import type { ZodIssue } from "zod";

import { agentManifestSchema, MANIFEST_VERSION } from "./schema.js";
import type { AgentManifest } from "./schema.js";

export class AgentManifestParseError extends Error {
  readonly issues: string[];

  constructor(issues: string[]) {
    super(`Agent manifest invalido: ${issues.join("; ")}`);
    this.name = "AgentManifestParseError";
    this.issues = issues;
  }
}

function formatIssue(issue: ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join(".") : "root";
  return `${path}: ${issue.message}`;
}

export function parseAgentManifest(input: unknown): AgentManifest {
  const result = agentManifestSchema.safeParse(input);

  if (!result.success) {
    const issues = result.error.issues.map(formatIssue);

    const version =
      typeof input === "object" && input !== null && "manifestVersion" in input
        ? (input as { manifestVersion?: unknown }).manifestVersion
        : undefined;

    if (typeof version === "string" && version !== MANIFEST_VERSION) {
      issues.unshift(
        `manifestVersion: versao incompativel (${version}). Esperado ${MANIFEST_VERSION}.`
      );
    }

    throw new AgentManifestParseError(issues);
  }

  return result.data;
}

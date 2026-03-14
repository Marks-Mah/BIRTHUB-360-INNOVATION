import { interpolateValue } from "../interpolation/interpolate.js";
import type { WorkflowRuntimeContext } from "../types.js";

export interface AiTextExtractConfig {
  fields: string[];
  text: string;
}

function findFieldValue(text: string, field: string): string | null {
  const escapedField = field.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escapedField}\\s*[:=-]\\s*([^\\n\\r,;]+)`, "i");
  const match = text.match(regex);
  return match?.[1]?.trim() ?? null;
}

// Max input string size (50KB) to prevent ReDoS CPU exhaustion
const MAX_TEXT_LENGTH = 50 * 1024;

export function executeAiTextExtractNode(
  config: AiTextExtractConfig,
  context: WorkflowRuntimeContext
): Record<string, string | null> {
  const interpolated = interpolateValue(config, context);
  const output: Record<string, string | null> = {};

  let textToProcess = interpolated.text || "";
  if (textToProcess.length > MAX_TEXT_LENGTH) {
    textToProcess = textToProcess.slice(0, MAX_TEXT_LENGTH);
  }

  for (const field of interpolated.fields) {
    output[field] = findFieldValue(textToProcess, field);
  }

  return output;
}


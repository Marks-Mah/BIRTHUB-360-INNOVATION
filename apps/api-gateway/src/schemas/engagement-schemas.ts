import type { Parser } from "../middleware/validate.js";

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

export const dealIdParamsSchema: Parser<{ id: string }> = (value) => {
  const obj = asObject(value);
  const id = typeof obj?.id === "string" ? obj.id.trim() : "";
  if (!id) return { success: false, errors: ["id param is required"] };
  return { success: true, data: { id } };
};

export const leadEnrichmentBodySchema: Parser<{ forceRefresh: boolean; source: "manual" | "automation" }> = (value) => {
  const obj = asObject(value) ?? {};
  const forceRefresh = obj.forceRefresh === undefined ? false : Boolean(obj.forceRefresh);
  const source = obj.source === undefined ? "manual" : obj.source;

  if (source !== "manual" && source !== "automation") {
    return { success: false, errors: ["source must be manual or automation"] };
  }

  return { success: true, data: { forceRefresh, source } };
};

export const leadOutreachBodySchema: Parser<{ channel: "email" | "linkedin" | "whatsapp"; cadenceId?: string }> = (value) => {
  const obj = asObject(value) ?? {};
  const channel = obj.channel;
  const cadenceId = typeof obj.cadenceId === "string" ? obj.cadenceId.trim() : undefined;

  if (channel !== "email" && channel !== "linkedin" && channel !== "whatsapp") {
    return { success: false, errors: ["channel must be email, linkedin or whatsapp"] };
  }

  if (cadenceId !== undefined && cadenceId.length === 0) {
    return { success: false, errors: ["cadenceId cannot be empty"] };
  }

  return { success: true, data: { channel, cadenceId } };
};

export const proposalBodySchema: Parser<{ templateId: string; expirationDays: number }> = (value) => {
  const obj = asObject(value);
  if (!obj) return { success: false, errors: ["body must be an object"] };

  const templateId = typeof obj.templateId === "string" ? obj.templateId.trim() : "";
  const expirationDays = Number(obj.expirationDays);

  const errors: string[] = [];
  if (!templateId) errors.push("templateId is required");
  if (!Number.isInteger(expirationDays) || expirationDays < 1 || expirationDays > 90) {
    errors.push("expirationDays must be integer 1..90");
  }

  if (errors.length > 0) return { success: false, errors };
  return { success: true, data: { templateId, expirationDays } };
};

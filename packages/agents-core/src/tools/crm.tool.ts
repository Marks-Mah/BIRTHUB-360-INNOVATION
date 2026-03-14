export type CrmProvider = "hubspot" | "salesforce";
export type CrmAction = "create_lead" | "update_lead" | "create_contact";

export interface CrmInput {
  action: CrmAction;
  payload: Record<string, unknown>;
  provider: CrmProvider;
  tenantId: string;
}

export interface CrmResult {
  action: CrmAction;
  endpoint: string;
  provider: CrmProvider;
  status: "ok";
}

function resolveEndpoint(provider: CrmProvider, action: CrmAction): string {
  const mapping: Record<CrmProvider, Record<CrmAction, string>> = {
    hubspot: {
      create_contact: "/crm/v3/objects/contacts",
      create_lead: "/crm/v3/objects/leads",
      update_lead: "/crm/v3/objects/leads/{id}"
    },
    salesforce: {
      create_contact: "/services/data/v60.0/sobjects/Contact",
      create_lead: "/services/data/v60.0/sobjects/Lead",
      update_lead: "/services/data/v60.0/sobjects/Lead/{id}"
    }
  };

  return mapping[provider][action];
}

export async function callCrmTool(
  input: CrmInput,
  options?: { simulate?: boolean }
): Promise<CrmResult> {
  const endpoint = resolveEndpoint(input.provider, input.action);

  if (!(options?.simulate ?? true)) {
    throw new Error("Live CRM calls are disabled in this environment.");
  }

  return {
    action: input.action,
    endpoint,
    provider: input.provider,
    status: "ok"
  };
}

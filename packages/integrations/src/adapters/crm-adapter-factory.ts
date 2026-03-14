import { HubspotClient } from "../clients/crm";
import { getCached, setCached } from "./cache";

export type CRMProvider = "hubspot" | "salesforce";

export interface CRMAdapter {
  upsertLead(tenantId: string, payload: Record<string, unknown>): Promise<unknown>;
}

class SalesforceClient {
  constructor(private readonly token: string, private readonly baseUrl = "https://api.salesforce.com") {}

  async upsertLead(payload: Record<string, unknown>) {
    const response = await fetch(`${this.baseUrl}/services/data/v60.0/sobjects/Lead`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.token}` },
      body: JSON.stringify(payload),
    });
    return response.json();
  }
}

const CACHE_TTL = 86_400;
const TIMEOUT_MS = 10_000;
const RETRIES = 3;

async function withRetry<T>(run: () => Promise<T>) {
  let lastError: unknown;
  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      return await Promise.race([
        run(),
        new Promise<T>((_resolve, reject) => setTimeout(() => reject(new Error("CRM_TIMEOUT")), TIMEOUT_MS)),
      ]);
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 200 * (2 ** attempt)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error("CRM_REQUEST_FAILED");
}

export class CRMAdapterFactory {
  constructor(private readonly tenantConfig: (tenantId: string) => { provider: CRMProvider; token: string }) {}

  getAdapter(tenantId: string): CRMAdapter {
    const cfg = this.tenantConfig(tenantId);
    if (cfg.provider === "salesforce") {
      const sf = new SalesforceClient(cfg.token);
      return {
        upsertLead: async (_tenant, payload) => withRetry(async () => sf.upsertLead(payload)),
      };
    }

    const hs = new HubspotClient(cfg.token);
    return {
      upsertLead: async (_tenant, payload) => {
        const cacheKey = `crm:${tenantId}:${JSON.stringify(payload)}`;
        const cached = await getCached<unknown>(cacheKey);
        if (cached) return cached;
        const value = await withRetry(async () => hs.createContact(payload));
        await setCached(cacheKey, value, CACHE_TTL);
        return value;
      },
    };
  }
}

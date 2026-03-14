import crypto from "node:crypto";

export interface WebhookEndpoint {
  id: string;
  url: string;
  secret: string;
  eventTypes: string[];
}

export class WebhookRegistry {
  private readonly store = new Map<string, WebhookEndpoint[]>();

  register(tenantId: string, endpoint: Omit<WebhookEndpoint, "id">) {
    const item: WebhookEndpoint = { id: crypto.randomUUID(), ...endpoint };
    const current = this.store.get(tenantId) ?? [];
    current.push(item);
    this.store.set(tenantId, current);
    return item;
  }

  list(tenantId: string) {
    return this.store.get(tenantId) ?? [];
  }

  createSignature(endpoint: WebhookEndpoint, payload: string): string {
    return crypto.createHmac("sha256", endpoint.secret).update(payload).digest("hex");
  }

  verifySignature(endpoint: WebhookEndpoint, payload: string, signature: string): boolean {
    return this.createSignature(endpoint, payload) === signature;
  }
}

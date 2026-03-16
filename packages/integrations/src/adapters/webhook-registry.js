import crypto from "node:crypto";
export class WebhookRegistry {
    store = new Map();
    register(tenantId, endpoint) {
        const item = { id: crypto.randomUUID(), ...endpoint };
        const current = this.store.get(tenantId) ?? [];
        current.push(item);
        this.store.set(tenantId, current);
        return item;
    }
    list(tenantId) {
        return this.store.get(tenantId) ?? [];
    }
    createSignature(endpoint, payload) {
        return crypto.createHmac("sha256", endpoint.secret).update(payload).digest("hex");
    }
    verifySignature(endpoint, payload, signature) {
        return this.createSignature(endpoint, payload) === signature;
    }
}

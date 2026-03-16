import { postJson } from "./http";
export class SvixClient {
    token;
    baseUrl;
    constructor(token, baseUrl = "https://api.svix.com/api/v1") {
        this.token = token;
        this.baseUrl = baseUrl;
    }
    createEndpoint(payload) {
        return postJson(`${this.baseUrl}/app/endpoints/`, payload, { apiKey: this.token, timeoutMs: 10_000, retries: 2 });
    }
}

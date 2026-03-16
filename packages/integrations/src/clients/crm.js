import { postJson } from "./http";
export class HubspotClient {
    token;
    baseUrl;
    constructor(token, baseUrl = "https://api.hubapi.com") {
        this.token = token;
        this.baseUrl = baseUrl;
    }
    createContact(payload) {
        return postJson(`${this.baseUrl}/crm/v3/objects/contacts`, payload, {
            apiKey: this.token,
            timeoutMs: 10_000,
            retries: 2,
        });
    }
}
export class PipedriveClient {
    token;
    baseUrl;
    constructor(token, baseUrl = "https://api.pipedrive.com/v1") {
        this.token = token;
        this.baseUrl = baseUrl;
    }
    createPerson(payload) {
        return postJson(`${this.baseUrl}/persons?api_token=${this.token}`, payload, {
            timeoutMs: 10_000,
            retries: 2,
        });
    }
}

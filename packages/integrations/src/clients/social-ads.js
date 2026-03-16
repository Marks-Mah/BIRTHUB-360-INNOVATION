import { postJson } from "./http";
export class MetaCloudApiClient {
    token;
    baseUrl;
    constructor(token, baseUrl = "https://graph.facebook.com/v19.0") {
        this.token = token;
        this.baseUrl = baseUrl;
    }
    sendWhatsAppTemplate(phoneNumberId, payload) {
        return postJson(`${this.baseUrl}/${phoneNumberId}/messages`, payload, { apiKey: this.token, timeoutMs: 10_000, retries: 2 });
    }
}
export class MetaAdsApiClient {
    token;
    baseUrl;
    constructor(token, baseUrl = "https://graph.facebook.com/v19.0") {
        this.token = token;
        this.baseUrl = baseUrl;
    }
    listCampaigns(adAccountId) {
        return fetch(`${this.baseUrl}/${adAccountId}/campaigns?access_token=${this.token}`).then((r) => r.json());
    }
}
export class GoogleAdsApiClient {
    developerToken;
    baseUrl;
    constructor(developerToken, baseUrl = "https://googleads.googleapis.com/v17") {
        this.developerToken = developerToken;
        this.baseUrl = baseUrl;
    }
    search(customerId, query) {
        return postJson(`${this.baseUrl}/customers/${customerId}/googleAds:search`, { query }, { apiKey: this.developerToken, timeoutMs: 15_000, retries: 2 });
    }
}

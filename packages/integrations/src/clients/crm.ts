import { postJson } from "./http";

export class HubspotClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl = "https://api.hubapi.com",
  ) {}

  createContact(payload: Record<string, unknown>) {
    return postJson(`${this.baseUrl}/crm/v3/objects/contacts`, payload, {
      apiKey: this.token,
      timeoutMs: 10_000,
      retries: 2,
    });
  }
}

export class PipedriveClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl = "https://api.pipedrive.com/v1",
  ) {}

  createPerson(payload: Record<string, unknown>) {
    return postJson(`${this.baseUrl}/persons?api_token=${this.token}`, payload, {
      timeoutMs: 10_000,
      retries: 2,
    });
  }
}

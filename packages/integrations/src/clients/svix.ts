import { postJson } from "./http";

export class SvixClient {
  constructor(
    private readonly token: string,
    private readonly baseUrl = "https://api.svix.com/api/v1",
  ) {}

  createEndpoint(payload: Record<string, unknown>) {
    return postJson(`${this.baseUrl}/app/endpoints/`, payload, { apiKey: this.token, timeoutMs: 10_000, retries: 2 });
  }
}

import { postJson } from "./http";

export class GoogleCalendarClient {
  constructor(
    private readonly accessToken: string,
    private readonly baseUrl = "https://www.googleapis.com/calendar/v3",
  ) {}

  async listEvents(calendarId = "primary") {
    const response = await fetch(`${this.baseUrl}/calendars/${calendarId}/events`, {
      method: "GET",
      headers: {
        authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`HTTP ${response.status}: ${body}`);
    }

    return response.json();
  }

  createEvent(calendarId: string, payload: Record<string, unknown>) {
    return postJson(
      `${this.baseUrl}/calendars/${calendarId}/events`,
      payload,
      { apiKey: this.accessToken, timeoutMs: 10_000, retries: 2 },
    );
  }
}

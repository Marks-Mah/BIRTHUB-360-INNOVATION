import { postJson } from "./http";
export class GoogleCalendarClient {
    accessToken;
    baseUrl;
    constructor(accessToken, baseUrl = "https://www.googleapis.com/calendar/v3") {
        this.accessToken = accessToken;
        this.baseUrl = baseUrl;
    }
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
    createEvent(calendarId, payload) {
        return postJson(`${this.baseUrl}/calendars/${calendarId}/events`, payload, { apiKey: this.accessToken, timeoutMs: 10_000, retries: 2 });
    }
}

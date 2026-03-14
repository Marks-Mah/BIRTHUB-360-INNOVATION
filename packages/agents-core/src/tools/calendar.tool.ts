import { randomUUID } from "node:crypto";

export type CalendarProvider = "google" | "ics";
export type CalendarAction = "create_event" | "list_events";

export interface CalendarInput {
  action: CalendarAction;
  endAt?: string;
  provider: CalendarProvider;
  startAt?: string;
  summary?: string;
}

export interface CalendarResult {
  action: CalendarAction;
  eventId: string;
  provider: CalendarProvider;
  raw: string;
}

function generateIcs(input: CalendarInput): string {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "BEGIN:VEVENT",
    `UID:${randomUUID()}`,
    `SUMMARY:${input.summary ?? "Untitled"}`,
    `DTSTART:${(input.startAt ?? new Date().toISOString()).replace(/[-:]/g, "")}`,
    `DTEND:${(input.endAt ?? new Date(Date.now() + 3_600_000).toISOString()).replace(/[-:]/g, "")}`,
    "END:VEVENT",
    "END:VCALENDAR"
  ].join("\n");
}

export async function callCalendarTool(
  input: CalendarInput,
  options?: { simulate?: boolean }
): Promise<CalendarResult> {
  if (!(options?.simulate ?? true)) {
    throw new Error("Live calendar calls are disabled in this environment.");
  }

  const raw = input.provider === "ics" ? generateIcs(input) : JSON.stringify({
    endAt: input.endAt,
    startAt: input.startAt,
    summary: input.summary
  });

  return {
    action: input.action,
    eventId: `evt_${Date.now()}`,
    provider: input.provider,
    raw
  };
}

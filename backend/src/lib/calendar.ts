import { createEvent, type DateArray, type EventAttributes } from "ics";

export interface CalendarInput {
  title: string;
  description?: string | null;
  externalLinks?: string[];
  eventDate: string; // YYYY-MM-DD
  startTime?: string | null; // HH:MM or HH:MM:SS
  durationMinutes?: number | null;
}

const DEFAULT_DURATION_MIN = 120;

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function dateParts(dateStr: string): [number, number, number] {
  const parts = dateStr.split("-").map(Number);
  return [parts[0] ?? 1970, parts[1] ?? 1, parts[2] ?? 1];
}

function timeParts(timeStr?: string | null): [number, number] | null {
  if (!timeStr) return null;
  const parts = timeStr.split(":").map(Number);
  if (parts[0] === undefined || parts[1] === undefined) return null;
  return [parts[0], parts[1]];
}

function fullDescription(input: CalendarInput): string {
  const links = input.externalLinks?.length
    ? "\n\n" + input.externalLinks.join("\n")
    : "";
  return `${input.description ?? ""}${links}`.trim();
}

/** Build a Google Calendar "render" URL (times are floating/local for v1). */
export function googleCalendarLink(input: CalendarInput): string {
  const [y, m, d] = dateParts(input.eventDate);
  const time = timeParts(input.startTime);

  let dates: string;
  if (time) {
    const start = new Date(Date.UTC(y, m - 1, d, time[0], time[1]));
    const end = new Date(
      start.getTime() + (input.durationMinutes ?? DEFAULT_DURATION_MIN) * 60_000,
    );
    const fmt = (dt: Date) =>
      `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}T${pad(dt.getUTCHours())}${pad(dt.getUTCMinutes())}00`;
    dates = `${fmt(start)}/${fmt(end)}`;
  } else {
    const start = new Date(Date.UTC(y, m - 1, d));
    const end = new Date(start.getTime() + 24 * 60 * 60_000);
    const fmt = (dt: Date) =>
      `${dt.getUTCFullYear()}${pad(dt.getUTCMonth() + 1)}${pad(dt.getUTCDate())}`;
    dates = `${fmt(start)}/${fmt(end)}`;
  }

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
    dates,
    details: fullDescription(input),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Build an iCalendar (.ics) document string. Throws if the ics library errors. */
export function buildIcs(input: CalendarInput): string {
  const [y, m, d] = dateParts(input.eventDate);
  const time = timeParts(input.startTime);

  const attrs: EventAttributes = time
    ? {
        title: input.title,
        description: fullDescription(input),
        start: [y, m, d, time[0], time[1]] as DateArray,
        startInputType: "local",
        duration: { minutes: input.durationMinutes ?? DEFAULT_DURATION_MIN },
      }
    : {
        title: input.title,
        description: fullDescription(input),
        start: [y, m, d] as DateArray,
        startInputType: "local",
        duration: { days: 1 },
      };

  const { error, value } = createEvent(attrs);
  if (error || !value) {
    throw new Error(`Failed to build .ics: ${error?.message ?? "unknown error"}`);
  }
  return value;
}

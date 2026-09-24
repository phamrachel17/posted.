// Time is written the way people say it. Exact times live in the postmark.

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Parts = { year: number; month: number; day: number; hour: number; minute: number };

function zoned(date: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
  });
  const get = (type: string) => Number(fmt.formatToParts(date).find((p) => p.type === type)?.value);
  return { year: get("year"), month: get("month"), day: get("day"), hour: get("hour"), minute: get("minute") };
}

/** Calendar day in a time zone, as "YYYY-MM-DD". */
export function dayKey(date: Date, timeZone: string): string {
  const p = zoned(date, timeZone);
  return `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
}

function keyToUTC(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

function daysApart(laterKey: string, earlierKey: string): number {
  return Math.round((keyToUTC(laterKey) - keyToUTC(earlierKey)) / 86_400_000);
}

function weekdayOf(key: string): string {
  return WEEKDAYS[new Date(keyToUTC(key)).getUTCDay()];
}

function partOfDay(hour: number): "morning" | "afternoon" | "evening" | "night" {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 21) return "evening";
  return "night";
}

/**
 * "just now", "this afternoon", "last night", "Tuesday evening", "last week", "12 September".
 * Told from the author's side: 11pm in Seattle is "last night" even if it was
 * already the next morning in Brooklyn. Times after midnight count as the night before.
 */
export function spokenTime(createdAt: string, authorLocal: string, viewerTz: string, now = new Date()): string {
  const created = new Date(createdAt);
  if (now.getTime() - created.getTime() < 2 * 60_000) return "just now";

  const hour = Number(authorLocal.slice(11, 13));
  const part = partOfDay(hour);
  let createdKey = authorLocal.slice(0, 10);
  if (hour < 5) createdKey = dayKey(new Date(keyToUTC(createdKey) - 86_400_000), "UTC");
  const diff = daysApart(dayKey(now, viewerTz), createdKey);

  if (diff <= 0) return part === "night" ? "tonight" : `this ${part}`;
  if (diff === 1) return part === "night" ? "last night" : `yesterday ${part}`;
  if (diff < 7) {
    const weekday = weekdayOf(createdKey);
    return part === "night" ? `late ${weekday} night` : `${weekday} ${part}`;
  }
  if (diff < 14) return "last week";

  const [y, m, d] = createdKey.split("-").map(Number);
  const sameYear = y === zoned(now, viewerTz).year;
  return `${d} ${MONTHS[m - 1]}${sameYear ? "" : ` ${y}`}`;
}

/** Full timestamp for hover titles. */
export function exactTime(createdAt: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(createdAt));
}

export type DayHeading = { isToday: boolean; weekday: string; date: string };

export function dayHeading(key: string, todayKey: string): DayHeading {
  const [y, m, d] = key.split("-").map(Number);
  const sameYear = y === Number(todayKey.slice(0, 4));
  return {
    isToday: key === todayKey,
    weekday: weekdayOf(key),
    date: `${d} ${MONTHS[m - 1]}${sameYear ? "" : ` ${y}`}`,
  };
}

/** Pieces of a postmark: city, "23 SEP", "4:10 PM". */
export function postmarkParts(local: string) {
  const [datePart, timePart = "00:00"] = local.split("T");
  const [, m, d] = datePart.split("-").map(Number);
  const [h, min] = timePart.split(":").map(Number);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return {
    date: `${d} ${MONTHS[m - 1].slice(0, 3).toUpperCase()}`,
    time: `${h12}:${String(min).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`,
  };
}

/** A clock face for the right rail, e.g. "7:42 pm". */
export function clockTime(timeZone: string, now = new Date()): string {
  const p = zoned(now, timeZone);
  const h12 = p.hour % 12 === 0 ? 12 : p.hour % 12;
  return `${h12}:${String(p.minute).padStart(2, "0")} ${p.hour < 12 ? "am" : "pm"}`;
}

/** Whole days from today until a "YYYY-MM-DD" date, in a time zone. */
export function daysUntil(dateKey: string, timeZone: string, now = new Date()): number {
  return daysApart(dateKey, dayKey(now, timeZone));
}

export function longDate(dateKey: string): string {
  const [, m, d] = dateKey.split("-").map(Number);
  return `${weekdayOf(dateKey)}, ${d} ${MONTHS[m - 1]}`;
}

/** "You were last here · Tuesday, 11:20 pm" style label for the divider. */
export function lastHereLabel(at: string, viewerTz: string, now = new Date()): string {
  const date = new Date(at);
  const key = dayKey(date, viewerTz);
  const diff = daysApart(dayKey(now, viewerTz), key);
  const clock = clockTime(viewerTz, date);
  if (diff <= 0) return `You were last here · ${clock}`;
  if (diff === 1) return `You were last here · yesterday, ${clock}`;
  if (diff < 7) return `You were last here · ${weekdayOf(key)}, ${clock}`;
  const [, m, d] = key.split("-").map(Number);
  return `You were last here · ${d} ${MONTHS[m - 1]}`;
}

/** Wall-clock time in a zone as "YYYY-MM-DDTHH:MM:SS", the same shape as a postmark. */
export function localStamp(date: Date, timeZone: string): string {
  const p = zoned(date, timeZone);
  const sec = new Intl.DateTimeFormat("en-US", { timeZone, second: "2-digit" }).format(date).padStart(2, "0");
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}:${sec}`;
}

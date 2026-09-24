import type { DayMeta, Mood, Weather } from "./types";

export const MOODS: { id: Mood; label: string }[] = [
  { id: "happy", label: "Happy" },
  { id: "calm", label: "Calm" },
  { id: "tired", label: "Tired" },
  { id: "stressed", label: "Stressed" },
  { id: "down", label: "Down" },
];

export const DAY_PROMPTS = [
  { key: "highlight", label: "One highlight" },
  { key: "accomplished", label: "A goal accomplished" },
  { key: "grateful", label: "Grateful for" },
] as const;

/** Prompts from before the switch to moods, so older days still show everything. */
export const LEGACY_PROMPTS = [
  { key: "today", label: "Today" },
  { key: "proud", label: "Proud of" },
  { key: "thinking", label: "Thinking about" },
  { key: "tomorrow", label: "Tomorrow" },
] as const;

const WEATHER_LABELS: Record<Weather, string> = {
  clear: "Clear",
  "bright-spells": "Bright spells",
  overcast: "Overcast",
  drizzle: "Drizzle",
  stormy: "Stormy",
};

export function moodLabel(id: string) {
  return MOODS.find((m) => m.id === id)?.label ?? "Mood";
}

/** How a day felt: the mood for new posts, the weather for older ones. */
export function dayFeeling(meta: DayMeta): { doodle: string; label: string } | null {
  if (meta.mood) return { doodle: `mood-${meta.mood}`, label: moodLabel(meta.mood) };
  if (meta.weather) return { doodle: `weather-${meta.weather}`, label: WEATHER_LABELS[meta.weather] ?? "Weather" };
  return null;
}

/** Every filled-in prompt on a day, new ones first. */
export function dayAnswers(meta: DayMeta): { key: string; label: string; text: string }[] {
  return [...DAY_PROMPTS, ...LEGACY_PROMPTS].flatMap((p) => {
    const text = meta[p.key];
    return typeof text === "string" && text ? [{ key: p.key, label: p.label, text }] : [];
  });
}

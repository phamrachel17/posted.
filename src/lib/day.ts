import type { Weather } from "./types";

export const WEATHER: { id: Weather; label: string }[] = [
  { id: "clear", label: "Clear" },
  { id: "bright-spells", label: "Bright spells" },
  { id: "overcast", label: "Overcast" },
  { id: "drizzle", label: "Drizzle" },
  { id: "stormy", label: "Stormy" },
];

export const DAY_PROMPTS = [
  { key: "today", label: "Today" },
  { key: "proud", label: "Proud of" },
  { key: "thinking", label: "Thinking about" },
  { key: "tomorrow", label: "Tomorrow" },
] as const;

export function weatherLabel(id: string) {
  return WEATHER.find((w) => w.id === id)?.label ?? "Weather";
}

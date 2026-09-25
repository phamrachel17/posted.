import type { CSSProperties } from "react";

export const INKS = {
  blue: { label: "Blue-black", color: "#2A4B8D", wash: "#E4E9F3" },
  verdigris: { label: "Verdigris", color: "#2E6A50", wash: "#E1EDE6" },
  oxblood: { label: "Oxblood", color: "#7A2E3A", wash: "#F1E3E4" },
  sepia: { label: "Sepia", color: "#6B4A2B", wash: "#EFE7DE" },
  slate: { label: "Slate", color: "#3E5261", wash: "#E3E8EB" },
  plum: { label: "Plum", color: "#5B3A6E", wash: "#EAE3EE" },
  "light-pink": { label: "Light pink", color: "#CC6F92", wash: "#FBE6EE" },
  rose: { label: "Rose", color: "#B84A77", wash: "#F6E1EA" },
  coral: { label: "Coral", color: "#B3563F", wash: "#F6E4DE" },
  marigold: { label: "Marigold", color: "#9C6B12", wash: "#F5ECD8" },
  teal: { label: "Teal", color: "#1F6E77", wash: "#DDEDEE" },
  sky: { label: "Sky", color: "#3A78B0", wash: "#E2ECF5" },
  lavender: { label: "Lavender", color: "#7458A8", wash: "#ECE6F4" },
} as const;

export type Ink = keyof typeof INKS;

export const INK_IDS = Object.keys(INKS) as Ink[];

export function isInk(value: unknown): value is Ink {
  return typeof value === "string" && value in INKS;
}

/** CSS custom properties that color everything a person made. */
export function inkStyle(ink: Ink): CSSProperties {
  return { "--ink-c": INKS[ink].color, "--ink-wash": INKS[ink].wash } as CSSProperties;
}

// Postage stamps for Today posts. A stamp is written as "design:<id>" for one of
// the designs below, or "photo:<path>" for a photo in the space's stamp book.

export type StampDesign = { id: string; label: string; doodle: string; paper: string; ink: string; value: string };

export const STAMP_DESIGNS: StampDesign[] = [
  { id: "dancing", label: "Dancing", doodle: "logo-small", paper: "#f4dcd6", ink: "#8b1e2b", value: "37¢" },
  { id: "tulip", label: "Tulip", doodle: "nav-today", paper: "#e3ecdd", ink: "#2e6a50", value: "5¢" },
  { id: "stars", label: "Tied stars", doodle: "nav-you-two", paper: "#dce4f2", ink: "#2a4b8d", value: "2¢" },
  { id: "record", label: "Music", doodle: "nb-music", paper: "#f5ebcb", ink: "#6b4a2b", value: "10¢" },
  { id: "popcorn", label: "Popcorn", doodle: "nb-popcorn", paper: "#f6e0d2", ink: "#b3563f", value: "25¢" },
  { id: "reading", label: "Reading", doodle: "nb-reading", paper: "#e6e0ef", ink: "#5b3a6e", value: "15¢" },
  { id: "happy", label: "Happy star", doodle: "mood-happy", paper: "#fbf1c9", ink: "#8a7414", value: "1¢" },
  { id: "pushpin", label: "Pushpin", doodle: "nav-kept", paper: "#e0edee", ink: "#1f6e77", value: "3¢" },
  { id: "cooking", label: "Cooking", doodle: "nb-cooking", paper: "#efe7de", ink: "#6b4a2b", value: "20¢" },
  { id: "heart", label: "Heart", doodle: "heart", paper: "#f5e0e1", ink: "#8b1e2b", value: "LOVE" },
];

export const DEFAULT_STAMP = "design:dancing";

/** A stamp ready to draw: a design, or a photo with a signed link. */
export type StampView = { kind: "design"; design: StampDesign } | { kind: "photo"; url: string | null };

/** A photo in the stamp book. */
export type BookStamp = { id: string; path: string; url: string | null; addedBy: string };

export function stampDesign(id: string) {
  return STAMP_DESIGNS.find((d) => d.id === id) ?? null;
}

export function isStampPath(path: string, spaceId: string) {
  return new RegExp(`^${spaceId}/stamp-[0-9a-f-]{36}\\.jpg$`).test(path);
}

/** Splits "design:tulip" / "photo:<path>" into its parts, or null if it isn't one. */
export function parseStamp(value: unknown): { kind: "design"; id: string } | { kind: "photo"; path: string } | null {
  if (typeof value !== "string") return null;
  if (value.startsWith("design:")) {
    const id = value.slice(7);
    return stampDesign(id) ? { kind: "design", id } : null;
  }
  if (value.startsWith("photo:")) return { kind: "photo", path: value.slice(6) };
  return null;
}

/** How to draw a stamp value, given signed links for photo stamps. */
export function stampView(value: unknown, urls: Map<string, string> | Record<string, string | null>): StampView | null {
  const s = parseStamp(value);
  if (!s) return null;
  if (s.kind === "design") return { kind: "design", design: stampDesign(s.id)! };
  const url = urls instanceof Map ? urls.get(s.path) : urls[s.path];
  return { kind: "photo", url: url ?? null };
}

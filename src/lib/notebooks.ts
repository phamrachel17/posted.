export const COVERS = {
  sky: "#DCE4EE",
  sand: "#E8E1D0",
  sage: "#DDE8DE",
  clay: "#EDE0DA",
  lilac: "#E4DFEC",
  stone: "#E5E6DE",
} as const;

export type Cover = keyof typeof COVERS;

export function coverColor(cover: string | null | undefined) {
  return COVERS[(cover as Cover) ?? "stone"] ?? COVERS.stone;
}

/** Drawings offered in the notebook picker, all hand-drawn. */
export const NOTEBOOK_DOODLES = [
  "nb-popcorn", "nb-music", "nb-language", "nb-reading", "nb-cooking", "nb-exercise", "nb-yoga",
  "heart", "d-flower", "d-flower-stem", "d-butterfly", "d-strawberries", "d-balloon", "d-house", "d-dog",
  "d-sea-otters", "d-flower-cat", "d-melting-clock", "d-sprig", "d-sun", "d-cloud", "d-swirls", "d-sleepy-face",
];

/** A notebook's doodle is either a file name ("nb-film") or text ("text:🎬"). */
export function isTextDoodle(doodle: string | null | undefined) {
  return Boolean(doodle?.startsWith("text:"));
}

export function slugify(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return base || "notebook";
}

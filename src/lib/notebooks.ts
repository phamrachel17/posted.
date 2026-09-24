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

/** Doodles offered in the notebook picker. Any file named nb-*.svg can be used. */
export const NOTEBOOK_DOODLES = [
  "nb-popcorn", "nb-music", "nb-language", "nb-book", "nb-film", "nb-pan",
  "nb-star", "nb-plane", "nb-thought", "nb-enye", "nb-heart", "nb-sun", "nb-camera", "nb-leaf",
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

/**
 * Stickers for hand-made scrapbook pages. Any name from /public/doodles works;
 * `aspect` is width ÷ height of the drawing so it isn't squashed.
 * Add new drawings here after running scripts/prepare-drawings.mjs.
 */
export const STICKERS: { name: string; label: string; aspect: number }[] = [
  { name: "logo", label: "Us, dancing", aspect: 900 / 689 },
  { name: "stars", label: "Tied stars", aspect: 325 / 360 },
  { name: "empty-today", label: "Tulip", aspect: 302 / 360 },
  { name: "kept", label: "Pushpin", aspect: 1 },
  { name: "empty-notebook", label: "Open notebook", aspect: 360 / 293 },
  { name: "nb-popcorn", label: "Popcorn", aspect: 1 },
  { name: "nb-music", label: "Music", aspect: 1 },
  { name: "nb-reading", label: "Reading", aspect: 1 },
  { name: "nb-cooking", label: "Cooking", aspect: 1 },
  { name: "empty-lessons", label: "Language cat", aspect: 480 / 433 },
  { name: "heart", label: "Heart", aspect: 1 },
  { name: "nb-star", label: "Star", aspect: 1 },
  { name: "nb-sun", label: "Sun", aspect: 1 },
  { name: "nb-plane", label: "Plane", aspect: 1 },
  { name: "nb-leaf", label: "Leaf", aspect: 1 },
];

export function stickerAspect(name: string | null) {
  return STICKERS.find((s) => s.name === name)?.aspect ?? 1;
}

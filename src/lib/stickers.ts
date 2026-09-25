/**
 * Stickers for hand-made scrapbook pages, in the groups the sticker tray shows.
 * Any name from /public/doodles works; `aspect` is width ÷ height of the drawing
 * so it isn't squashed. To swap a placeholder for your own drawing, prepare a
 * drawing with the same name (see scripts/prepare-drawings.mjs).
 */
export type Sticker = { name: string; label: string; aspect: number };

export const STICKER_GROUPS: { title: string; stickers: Sticker[] }[] = [
  {
    title: "Your drawings",
    stickers: [
      { name: "logo", label: "Us, dancing", aspect: 900 / 689 },
      { name: "stars", label: "Tied stars", aspect: 325 / 360 },
      { name: "empty-today", label: "Tulip", aspect: 302 / 360 },
      { name: "kept", label: "Pushpin", aspect: 1 },
      { name: "empty-notebook", label: "Open notebook", aspect: 360 / 293 },
      { name: "nb-popcorn", label: "Popcorn", aspect: 1 },
      { name: "nb-music", label: "Music", aspect: 1 },
      { name: "nb-reading", label: "Reading", aspect: 1 },
      { name: "nb-cooking", label: "Cooking", aspect: 1 },
      { name: "nb-exercise", label: "Exercise", aspect: 1 },
      { name: "nb-yoga", label: "Yoga", aspect: 1 },
      { name: "empty-lessons", label: "Language cat", aspect: 480 / 426 },
    ],
  },
  {
    title: "Little doodles",
    stickers: [
      { name: "heart", label: "Heart", aspect: 1 },
      { name: "st-heart-filled", label: "Filled heart", aspect: 1 },
      { name: "st-sparkle", label: "Sparkle", aspect: 1 },
      { name: "st-sparkles", label: "Sparkles", aspect: 1 },
      { name: "nb-star", label: "Star", aspect: 1 },
      { name: "st-flower", label: "Flower", aspect: 1 },
      { name: "st-daisy", label: "Daisy", aspect: 1 },
      { name: "nb-leaf", label: "Leaf", aspect: 1 },
      { name: "st-plant", label: "Plant", aspect: 1 },
      { name: "st-butterfly", label: "Butterfly", aspect: 1 },
      { name: "st-moon", label: "Moon", aspect: 1 },
      { name: "nb-sun", label: "Sun", aspect: 1 },
      { name: "st-rainbow", label: "Rainbow", aspect: 1 },
      { name: "st-balloon", label: "Balloon", aspect: 1 },
      { name: "st-gift", label: "Gift", aspect: 1 },
      { name: "st-crown", label: "Crown", aspect: 1 },
      { name: "st-coffee", label: "Coffee", aspect: 1 },
      { name: "st-notes", label: "Music notes", aspect: 1 },
      { name: "st-house", label: "Home", aspect: 1 },
      { name: "st-pin", label: "Map pin", aspect: 1 },
      { name: "nb-plane", label: "Plane", aspect: 1 },
      { name: "st-speech", label: "Speech bubble", aspect: 1 },
      { name: "st-arrow", label: "Arrow", aspect: 1 },
    ],
  },
  {
    title: "Moods and weather",
    stickers: [
      { name: "mood-happy", label: "Happy", aspect: 1 },
      { name: "mood-calm", label: "Calm", aspect: 1 },
      { name: "mood-okay", label: "Okay", aspect: 1 },
      { name: "mood-tired", label: "Tired", aspect: 1 },
      { name: "mood-stressed", label: "Stressed", aspect: 1 },
      { name: "mood-down", label: "Sad", aspect: 1 },
      { name: "weather-clear", label: "Sunny", aspect: 1 },
      { name: "weather-bright-spells", label: "Partly sunny", aspect: 1 },
      { name: "weather-overcast", label: "Cloudy", aspect: 1 },
      { name: "weather-drizzle", label: "Rain", aspect: 1 },
      { name: "weather-stormy", label: "Storm", aspect: 1 },
    ],
  },
  {
    title: "Paper bits",
    stickers: [
      { name: "st-tape", label: "Washi tape", aspect: 60 / 18 },
      { name: "st-stamp", label: "Postage stamp", aspect: 20 / 24 },
      { name: "st-ticket", label: "Ticket", aspect: 1 },
      { name: "st-envelope", label: "Envelope", aspect: 1 },
    ],
  },
];

export const STICKERS: Sticker[] = STICKER_GROUPS.flatMap((g) => g.stickers);

export function stickerAspect(name: string | null) {
  return STICKERS.find((s) => s.name === name)?.aspect ?? 1;
}

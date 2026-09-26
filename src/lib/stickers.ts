/**
 * Stickers for hand-made scrapbook pages, in the groups the sticker tray shows.
 * Any name from /public/doodles works; `aspect` is width ÷ height of the drawing
 * so it isn't squashed. To swap a placeholder for your own drawing, prepare a
 * drawing with the same name (see scripts/prepare-drawings.mjs).
 */
export type Sticker = { name: string; label: string; aspect: number };

export const STICKER_GROUPS: { title: string; stickers: Sticker[] }[] = [
  {
    title: "Doodles",
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
      { name: "heart", label: "Heart", aspect: 1 },
      { name: "d-flower", label: "Flower", aspect: 360 / 328 },
      { name: "d-flower-stem", label: "Flower on a stem", aspect: 281 / 360 },
      { name: "d-sprig", label: "Sprig", aspect: 308 / 420 },
      { name: "d-butterfly", label: "Butterfly", aspect: 360 / 342 },
      { name: "d-strawberries", label: "Strawberries", aspect: 360 / 279 },
      { name: "d-balloon", label: "Balloon", aspect: 158 / 360 },
      { name: "d-swirls", label: "Swirls", aspect: 327 / 360 },
      { name: "d-flower-cat", label: "Flower cat", aspect: 333 / 360 },
      { name: "d-dog", label: "Dog", aspect: 297 / 360 },
      { name: "d-sea-otters", label: "Sea otters", aspect: 355 / 420 },
      { name: "d-house", label: "Home", aspect: 420 / 377 },
      { name: "d-melting-clock", label: "Melting clock", aspect: 286 / 360 },
      { name: "d-sleepy-face", label: "Sleepy face", aspect: 300 / 291 },
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
      { name: "d-sun", label: "Sunny", aspect: 360 / 350 },
            { name: "d-cloud", label: "Cloudy", aspect: 360 / 200 },
      { name: "d-rain", label: "Rain", aspect: 360 / 345 },
      { name: "d-storm", label: "Storm", aspect: 360 / 328 },
    ],
  },
];

export const STICKERS: Sticker[] = STICKER_GROUPS.flatMap((g) => g.stickers);

export function stickerAspect(name: string | null) {
  return STICKERS.find((s) => s.name === name)?.aspect ?? 1;
}

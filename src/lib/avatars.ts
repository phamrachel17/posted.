// Drawings a person can pick as their icon instead of a photo.
export const AVATAR_ICONS = [
  "stars",
  "heart",
  "st-flower",
  "st-daisy",
  "st-butterfly",
  "st-moon",
  "nb-sun",
  "nb-leaf",
  "st-coffee",
  "nb-music",
  "nb-popcorn",
  "nb-reading",
  "nb-cooking",
  "nb-yoga",
  "st-crown",
  "mood-happy",
] as const;

export function isAvatarIcon(name: unknown): name is string {
  return typeof name === "string" && (AVATAR_ICONS as readonly string[]).includes(name);
}

/** Uploaded pictures are named like this, inside the space's folder. */
export function isAvatarPath(path: string, spaceId: string) {
  return new RegExp(`^${spaceId}/avatar-[0-9a-f-]{36}\\.jpg$`).test(path);
}

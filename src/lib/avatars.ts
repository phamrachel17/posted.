/** Uploaded pictures are named like this, inside the space's folder. */
export function isAvatarPath(path: string, spaceId: string) {
  return new RegExp(`^${spaceId}/avatar-[0-9a-f-]{36}\\.jpg$`).test(path);
}

// Finds Spotify links in text a person wrote, so a post can show Spotify's
// player instead of the long URL. Safe to use on the client.

export type SpotifyLink = { kind: "track" | "album" | "playlist" | "episode" | "show" | "artist"; id: string };

const LINK = /https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]{10,40})\S*/gi;
const MAX_EMBEDS = 3;

/** The text with Spotify links taken out, and the links (first three, no repeats). */
export function splitSpotify(text: string): { text: string; links: SpotifyLink[] } {
  const links: SpotifyLink[] = [];
  const rest = text.replace(LINK, (_, kind: string, id: string) => {
    if (links.length < MAX_EMBEDS && !links.some((l) => l.id === id)) links.push({ kind: kind.toLowerCase() as SpotifyLink["kind"], id });
    return "";
  });
  if (links.length === 0) return { text, links };
  // Tidy the gaps a removed link leaves behind: trailing spaces and extra blank lines.
  const tidy = rest.replace(/[ \t]+$/gm, "").replace(/\n{3,}/g, "\n\n").trim();
  return { text: tidy, links };
}

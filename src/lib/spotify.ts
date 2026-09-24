import "server-only";

// Turns a pasted Spotify link into a song: title, artist, and album art, from
// Spotify's public page for it. No Spotify account or API key is needed.

export type SpotifyKind = "track" | "album" | "playlist";
export type SpotifyRef = { kind: SpotifyKind; id: string };
export type SpotifyMeta = { title: string; artist: string | null; image: string | null; preview: string | null };

/** Accepts open.spotify.com links (with or without /intl-xx/ and ?si=…) and spotify:track:… URIs. */
export function parseSpotify(input: string): SpotifyRef | null {
  const text = input.trim();
  const uri = text.match(/^spotify:(track|album|playlist):([A-Za-z0-9]{10,40})$/);
  if (uri) return { kind: uri[1] as SpotifyKind, id: uri[2] };
  try {
    const url = new URL(text);
    if (!/(^|\.)spotify\.com$/.test(url.hostname)) return null;
    const m = url.pathname.match(/\/(track|album|playlist)\/([A-Za-z0-9]{10,40})/);
    return m ? { kind: m[1] as SpotifyKind, id: m[2] } : null;
  } catch {
    return null;
  }
}

function decode(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export async function spotifyMeta(ref: SpotifyRef): Promise<SpotifyMeta | null> {
  const url = `https://open.spotify.com/${ref.kind}/${ref.id}`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (posted.)", "Accept-Language": "en" },
      signal: AbortSignal.timeout(5000),
      cache: "no-store",
    });
    if (res.ok) {
      const html = await res.text();
      const og = (p: string) => html.match(new RegExp(`<meta property="og:${p}" content="([^"]*)"`))?.[1];
      const title = og("title");
      if (title) {
        // Tracks: "Artist · Album · Song · 1987". Albums: "Artist · Album · 1987 · 12 songs". Playlists: "Playlist · Name · …".
        const parts = decode(og("description") ?? "").split(" · ");
        const artist = ref.kind === "playlist" ? null : parts[0] || null;
        const image = og("image");
        // Album and playlist pages title themselves "Name - Album by Artist | Spotify".
        const clean = decode(title).replace(/\s+-\s+(Album|Single|EP|Playlist|Compilation) by .*$/i, "").replace(/\s*\|\s*Spotify$/, "");
        const audio = og("audio");
        return {
          title: clean,
          artist,
          image: image?.startsWith("https://i.scdn.co/") ? image : null,
          preview: audio?.startsWith("https://p.scdn.co/") ? audio : null,
        };
      }
    }
  } catch {
    // Fall back to oEmbed below.
  }
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000), cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as { title?: string; thumbnail_url?: string };
    if (!data.title) return null;
    return { title: data.title, artist: null, image: data.thumbnail_url?.startsWith("https://i.scdn.co/") ? data.thumbnail_url : null, preview: null };
  } catch {
    return null;
  }
}

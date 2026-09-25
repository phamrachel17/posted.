import type { SpotifyLink } from "@/lib/spotify-links";

/** Spotify's own player for each link, the way it looks when a link is shared anywhere else. */
export function SpotifyEmbeds({ links }: { links: SpotifyLink[] }) {
  if (links.length === 0) return null;
  return (
    <div className="spotify-embeds">
      {links.map((l) => (
        <iframe
          key={l.id}
          className="spotify-embed"
          title={`Spotify ${l.kind}`}
          src={`https://open.spotify.com/embed/${l.kind}/${l.id}?utm_source=generator`}
          height={l.kind === "track" || l.kind === "episode" ? 80 : 152}
          loading="lazy"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        />
      ))}
    </div>
  );
}

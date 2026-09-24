"use client";

/* eslint-disable @next/next/no-img-element -- album art from Spotify's image CDN */
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { putOnSong } from "@/app/actions/jukebox";
import type { Song } from "@/lib/data";
import { createClient } from "@/lib/supabase/client";

type Props = {
  current: Song | null;
  earlier: Song[];
  names: Record<string, string>;
  meId: string;
  spaceId: string;
  /** Spoken time for when the current song went on, e.g. "Tuesday evening". */
  when: string | null;
  preview?: boolean;
};

const openUrl = (s: Song) => `https://open.spotify.com/${s.kind}/${s.spotify_id}`;

/**
 * A record player shared by the two of you. Whatever was put on last stays on
 * until one of you changes it, so it's a quiet way to pass each other songs.
 */
export function Jukebox({ current, earlier, names, meId, spaceId, when, preview }: Props) {
  const [playing, setPlaying] = useState(false);
  const [changing, setChanging] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  // When the other person puts something on, the record changes here too.
  useEffect(() => {
    if (preview) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`jukebox:${spaceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "jukebox_songs", filter: `space_id=eq.${spaceId}` }, () => {
        setPlaying(false);
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, router, preview]);

  const who = current ? (current.set_by === meId ? "You" : (names[current.set_by] ?? "Someone")) : null;

  return (
    <div className="jukebox">
      <div className="jukebox-top">
        <button
          type="button"
          className={current ? "vinyl is-on" : "vinyl"}
          aria-label={current ? (playing ? "Hide player" : `Play ${current.title}`) : "Put a song on"}
          onClick={() => (current ? setPlaying((p) => !p) : setChanging(true))}
        >
          <span className="vinyl-label">
            {current?.image ? <img src={current.image} alt="" /> : <span className="vinyl-blank" />}
          </span>
          <span className="vinyl-hole" aria-hidden />
        </button>
        <div className="jukebox-now">
          {current ? (
            <>
              <a href={openUrl(current)} target="_blank" rel="noreferrer" className="jukebox-title">
                {current.title}
              </a>
              {current.artist && <span className="jukebox-artist">{current.artist}</span>}
              <span className="hint">
                {who} put this on{when ? ` · ${when}` : ""}
              </span>
            </>
          ) : (
            <span className="hint">Nothing on yet. Put on a song for the other person to find.</span>
          )}
        </div>
      </div>

      {current && playing && (
        <iframe
          className="jukebox-player"
          title={`Spotify: ${current.title}`}
          src={`https://open.spotify.com/embed/${current.kind}/${current.spotify_id}?utm_source=posted&theme=0`}
          height={current.kind === "track" ? 80 : 152}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}

      {changing ? (
        <form
          className="jukebox-change"
          onSubmit={(e) => {
            e.preventDefault();
            if (!link.trim() || preview) return;
            startTransition(async () => {
              const r = await putOnSong(link);
              if (r.error) return setError(r.error);
              setError(null);
              setLink("");
              setChanging(false);
              setPlaying(false);
            });
          }}
        >
          <input
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="Paste a Spotify link"
            aria-label="Spotify link"
            autoFocus
          />
          <div className="jukebox-actions">
            <button type="submit" className="btn btn-primary" disabled={pending || !link.trim()}>
              {pending ? "Putting it on…" : "Put it on"}
            </button>
            <button type="button" className="btn btn-quiet" onClick={() => { setChanging(false); setError(null); }}>
              Cancel
            </button>
          </div>
          <span className="hint">In Spotify: Share → Copy link.</span>
        </form>
      ) : (
        <button type="button" className="text-link" onClick={() => setChanging(true)}>
          {current ? "Change the song" : "Put a song on"}
        </button>
      )}
      {error && <p className="error-note"><b>{error}</b></p>}

      {earlier.length > 0 && (
        <details className="jukebox-earlier">
          <summary>Played before</summary>
          <ul>
            {earlier.map((s) => (
              <li key={s.id}>
                <a href={openUrl(s)} target="_blank" rel="noreferrer">
                  {s.title}
                  {s.artist ? ` · ${s.artist}` : ""}
                </a>
                <span className="hint">{s.set_by === meId ? "you" : names[s.set_by]}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

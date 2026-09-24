"use client";

/* eslint-disable @next/next/no-img-element -- album art from Spotify's image CDN */
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { putOnSong } from "@/app/actions/jukebox";
import type { Song } from "@/lib/data";
import { DRAWN } from "@/lib/drawn";
import { useSpotifyEmbed } from "@/lib/spotify-embed";
import { createClient } from "@/lib/supabase/client";
import { doodleUrl } from "./Doodle";

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

/**
 * Opens a song in the Spotify app. Phones do this on their own from the
 * normal link; on a computer we try the app's spotify: address first and fall
 * back to the website if nothing picked it up.
 */
function openInSpotify(s: Pick<Song, "kind" | "spotify_id">) {
  const web = `https://open.spotify.com/${s.kind}/${s.spotify_id}`;
  if (/iPhone|iPad|iPod|Android/i.test(navigator.userAgent)) {
    window.location.href = web;
    return;
  }
  let handedOff = false;
  const onBlur = () => (handedOff = true);
  window.addEventListener("blur", onBlur, { once: true });
  window.location.href = `spotify:${s.kind}:${s.spotify_id}`;
  window.setTimeout(() => {
    window.removeEventListener("blur", onBlur);
    if (!handedOff && document.visibilityState === "visible") window.open(web, "_blank", "noopener");
  }, 1500);
}

// A hand-drawn record (drawings/record.PNG → "record") replaces the drawn-in-code one.
const DRAWN_RECORD = DRAWN.has("record");

/**
 * A record player shared by the two of you. Whatever was put on last stays on
 * until one of you changes it, so it's a quiet way to pass each other songs.
 */
export function Jukebox({ current, earlier, names, meId, spaceId, when, preview }: Props) {
  // Our own <audio> preview, used only if Spotify's player can't load.
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [shown, setShown] = useState(false);
  const {
    holder: embedHolder,
    state: embedState,
    toggle: embedToggle,
    pause: embedPause,
  } = useSpotifyEmbed(current ? `spotify:${current.kind}:${current.spotify_id}` : null, !preview);
  const useEmbed = !preview && embedState.ready && !embedState.failed;
  const playing = useEmbed ? embedState.playing : audioPlaying;
  const progress = useEmbed ? embedState.progress : audioProgress;
  const [changing, setChanging] = useState(false);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const audioRef = useRef<HTMLAudioElement>(null);
  const router = useRouter();

  // When the other person puts something on, the record changes here too.
  useEffect(() => {
    if (preview) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`jukebox:${spaceId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "jukebox_songs", filter: `space_id=eq.${spaceId}` }, () => {
        audioRef.current?.pause();
        embedPause();
        router.refresh();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, router, preview, embedPause]);

  async function togglePlay() {
    const el = audioRef.current;
    if (!current) return setChanging(true);
    if (useEmbed) {
      setShown(true);
      window.dispatchEvent(new CustomEvent("posted:play", { detail: "jukebox" }));
      return embedToggle();
    }
    if (!el || !current.preview) return openInSpotify(current);
    if (!el.paused) return el.pause();
    try {
      // One sound at a time: pause any voice memo that's playing.
      window.dispatchEvent(new CustomEvent("posted:play", { detail: "jukebox" }));
      await el.play();
      setError(null);
    } catch {
      setError("The preview couldn't play here. Tap the song name to open it in Spotify.");
    }
  }

  // Stop if a voice memo starts.
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail === "jukebox") return;
      audioRef.current?.pause();
      embedPause();
    };
    window.addEventListener("posted:play", onOther);
    return () => window.removeEventListener("posted:play", onOther);
  }, [embedPause]);

  const who = current ? (current.set_by === meId ? "You" : (names[current.set_by] ?? "Someone")) : null;
  const classes = ["vinyl", current && "is-on", playing && "is-playing", DRAWN_RECORD && "is-drawn"].filter(Boolean).join(" ");

  return (
    <div className="jukebox">
      <div className={playing ? "jukebox-top is-playing" : "jukebox-top"}>
        <button
          type="button"
          className={classes}
          aria-label={!current ? "Put a song on" : playing ? "Pause" : useEmbed || current.preview ? `Play ${current.title}` : `Open ${current.title} in Spotify`}
          onClick={togglePlay}
        >
          {DRAWN_RECORD && <span className="vinyl-drawing" style={{ "--doodle": `url(${doodleUrl("record")})` } as React.CSSProperties} aria-hidden />}
          <span className="vinyl-label">
            {current?.image ? <img src={current.image} alt="" /> : <span className="vinyl-blank" />}
          </span>
          <span className="vinyl-hole" aria-hidden />
        </button>
        <div className="jukebox-now">
          {current ? (
            <>
              <button type="button" className="jukebox-title" onClick={() => openInSpotify(current)}>
                {current.title}
              </button>
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

      {current && (useEmbed || current.preview) && (
        <div className="jukebox-controls">
          <button type="button" className="b-tool" onClick={togglePlay}>
            {playing ? "❚❚ Pause" : useEmbed ? "▶ Play" : "▶ Play preview"}
          </button>
        </div>
      )}

      {/* Spotify's own player. It stays tucked away until the first play. */}
      {!preview && <div ref={embedHolder} className={shown ? "jukebox-embed is-shown" : "jukebox-embed"} />}

      {useEmbed && embedState.previewOnly && (
        <div className="jukebox-signin">
          <span>You&rsquo;re hearing a 30-second preview. Sign in to Spotify in this browser to hear whole songs.</span>
          <a className="btn" href="https://accounts.spotify.com/login?continue=https%3A%2F%2Fopen.spotify.com%2F" target="_blank" rel="noreferrer">
            Sign in to Spotify
          </a>
          <span className="hint">Then come back and refresh this page.</span>
        </div>
      )}

      {!useEmbed && current?.preview && (playing || progress > 0) && (
        <div className="jukebox-progress" aria-hidden>
          <i style={{ width: `${progress * 100}%` }} />
        </div>
      )}
      {current?.preview && (
        <audio
          ref={audioRef}
          src={current.preview}
          preload="none"
          onPlay={() => setAudioPlaying(true)}
          onPause={() => setAudioPlaying(false)}
          onEnded={() => {
            setAudioPlaying(false);
            setAudioProgress(0);
          }}
          onTimeUpdate={(e) => setAudioProgress(e.currentTarget.duration ? e.currentTarget.currentTime / e.currentTarget.duration : 0)}
          onError={() => setError("The preview couldn't load. Tap the song name to open it in Spotify.")}
        />
      )}
      {!useEmbed && current?.preview && <span className="hint">A 30-second preview. Tap the song name for the whole thing in Spotify.</span>}

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
              audioRef.current?.pause();
            });
          }}
        >
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste a Spotify link" aria-label="Spotify link" autoFocus />
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
                <button type="button" onClick={() => openInSpotify(s)}>
                  {s.title}
                  {s.artist ? ` · ${s.artist}` : ""}
                </button>
                <span className="hint">{s.set_by === meId ? "you" : names[s.set_by]}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

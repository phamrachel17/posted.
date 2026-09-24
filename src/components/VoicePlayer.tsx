"use client";

import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/voice";
import { Doodle } from "./Doodle";

type Props = {
  id: string;
  url: string | null;
  durationMs: number;
  peaks: number[];
  small?: boolean;
  /** Draft previews don't remember position or "finished". */
  draft?: boolean;
};

const SPEEDS = [1, 1.5, 2];
const PLAY_EVENT = "posted:play";

function read(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be blocked; playback still works.
  }
}

/** A voice memo in the speaker's ink. Click the wave to seek, the time to change speed. */
export function VoicePlayer({ id, url, durationMs, peaks, small, draft }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(durationMs / 1000);
  const [speed, setSpeed] = useState(1);
  const [finished, setFinished] = useState(false);
  const [failed, setFailed] = useState(false);

  const bars = peaks.length ? peaks : Array.from({ length: 48 }, () => 30);
  const progress = duration ? position / duration : 0;

  // Remembered position and "finished" are this browser's private cues.
  useEffect(() => {
    if (draft) return;
    const saved = Number(read(`posted:pos:${id}`));
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    if (saved > 0) setPosition(saved);
    setFinished(read(`posted:done:${id}`) === "1");
  }, [id, draft]);

  // Only one memo plays at a time.
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== id) audioRef.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, onOther);
    return () => window.removeEventListener(PLAY_EVENT, onOther);
  }, [id]);

  async function toggle() {
    const el = audioRef.current;
    if (!el || !url) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    if (position > 0 && Math.abs(el.currentTime - position) > 0.5 && position < duration - 0.25) el.currentTime = position;
    el.playbackRate = speed;
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: id }));
    try {
      await el.play();
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const el = audioRef.current;
    if (!el || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration;
    el.currentTime = t;
    setPosition(t);
  }

  function cycleSpeed() {
    const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(next);
    if (audioRef.current) audioRef.current.playbackRate = next;
  }

  const showTime = playing || (position > 0 && position < duration) ? position : duration;

  return (
    <div className={small ? "voice small" : "voice"} data-finished={finished || undefined}>
      <button type="button" className="voice-play" onClick={toggle} disabled={!url} aria-label={playing ? "Pause" : "Play voice memo"}>
        <Doodle name={playing ? "pause" : "play"} size={small ? 13 : 16} />
      </button>
      <div
        className="voice-wave"
        onClick={seek}
        role="slider"
        tabIndex={0}
        aria-label="Position"
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(position)}
        onKeyDown={(e) => {
          const el = audioRef.current;
          if (!el) return;
          if (e.key === "ArrowRight") el.currentTime = Math.min(duration, el.currentTime + 5);
          if (e.key === "ArrowLeft") el.currentTime = Math.max(0, el.currentTime - 5);
        }}
      >
        {bars.map((p, i) => (
          <i key={i} style={{ height: `${Math.max(8, p)}%` }} className={i / bars.length < progress ? "on" : undefined} />
        ))}
      </div>
      <button type="button" className="voice-time" onClick={cycleSpeed} title="Change speed">
        {formatDuration(showTime * 1000)}
        {speed !== 1 && ` · ${speed}×`}
      </button>
      {failed && <span className="visually-hidden" role="status">This memo couldn&rsquo;t play.</span>}
      {url && (
        <audio
          ref={audioRef}
          src={url}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => {
            setPlaying(false);
            if (!draft) write(`posted:pos:${id}`, String(audioRef.current?.currentTime ?? 0));
          }}
          onTimeUpdate={(e) => setPosition(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }}
          onEnded={() => {
            setPlaying(false);
            setPosition(0);
            if (!draft) {
              setFinished(true);
              write(`posted:done:${id}`, "1");
              write(`posted:pos:${id}`, null);
            }
          }}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
}

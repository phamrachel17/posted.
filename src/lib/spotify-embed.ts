"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Spotify's embed player, driven from our own record. Full songs play when the
// person is signed in to Spotify in this browser; otherwise Spotify plays a
// 30-second preview, which we can tell from the length it reports.

type PlaybackUpdate = { data: { isPaused: boolean; isBuffering: boolean; duration: number; position: number } };
type Controller = {
  loadUri: (uri: string) => void;
  togglePlay: () => void;
  pause: () => void;
  addListener: (event: string, cb: (e: PlaybackUpdate) => void) => void;
  destroy: () => void;
};
type IFrameAPI = {
  createController: (el: HTMLElement, options: { uri: string; width?: string | number; height?: number }, cb: (c: Controller) => void) => void;
};

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameAPI) => void;
    __spotifyApi?: Promise<IFrameAPI>;
  }
}

const SCRIPT = "https://open.spotify.com/embed/iframe-api/v1";
const PREVIEW_MS = 31_000;

function loadApi(): Promise<IFrameAPI> {
  if (window.__spotifyApi) return window.__spotifyApi;
  window.__spotifyApi = new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve;
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onerror = () => reject(new Error("Spotify player didn't load"));
    document.body.appendChild(script);
    window.setTimeout(() => reject(new Error("Spotify player took too long")), 10_000);
  });
  return window.__spotifyApi;
}

export type EmbedState = {
  ready: boolean;
  failed: boolean;
  playing: boolean;
  /** 0–1 */
  progress: number;
  /** True once Spotify reports a ~30s length, meaning this browser isn't signed in. */
  previewOnly: boolean;
  /** Spotify stopped by itself partway through (another device took over, or the account can't play here). */
  stalled: boolean;
  /** Seconds in when it stopped, so a fallback can pick up from there. */
  stalledAt: number;
};

export function useSpotifyEmbed(uri: string | null, enabled: boolean) {
  const holder = useRef<HTMLDivElement>(null);
  const controller = useRef<Controller | null>(null);
  const [state, setState] = useState<EmbedState>({ ready: false, failed: false, playing: false, progress: 0, previewOnly: false, stalled: false, stalledAt: 0 });
  // When we asked Spotify to pause; a pause we didn't ask for means it stopped on its own.
  const pausedByUs = useRef(0);
  const wasPlaying = useRef(false);

  // Create the player once.
  useEffect(() => {
    if (!enabled || !uri || !holder.current) return;
    let cancelled = false;
    const el = document.createElement("div");
    holder.current.appendChild(el);
    loadApi()
      .then((api) =>
        api.createController(el, { uri, width: "100%", height: 80 }, (c) => {
          if (cancelled) return c.destroy();
          controller.current = c;
          c.addListener("playback_update", (e) => {
            const { isPaused, isBuffering, duration, position } = e.data;
            const stoppedOnItsOwn =
              wasPlaying.current && isPaused && !isBuffering && Date.now() - pausedByUs.current > 1500 && duration > 0 && position < duration - 2000;
            wasPlaying.current = !isPaused;
            setState((s) => ({
              ...s,
              playing: !isPaused,
              progress: duration ? position / duration : 0,
              previewOnly: duration > 0 && duration <= PREVIEW_MS,
              stalled: s.stalled || stoppedOnItsOwn,
              stalledAt: stoppedOnItsOwn ? position / 1000 : s.stalledAt,
            }));
          });
          setState((s) => ({ ...s, ready: true }));
        }),
      )
      .catch(() => !cancelled && setState((s) => ({ ...s, failed: true })));
    return () => {
      cancelled = true;
      controller.current?.destroy();
      controller.current = null;
    };
    // Changing songs uses loadUri below instead of rebuilding the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // A new song was put on.
  useEffect(() => {
    if (uri && controller.current) {
      controller.current.loadUri(uri);
      setState((s) => ({ ...s, playing: false, progress: 0, previewOnly: false, stalled: false, stalledAt: 0 }));
    }
  }, [uri]);

  const toggle = useCallback(() => {
    if (wasPlaying.current) pausedByUs.current = Date.now();
    controller.current?.togglePlay();
  }, []);
  const pause = useCallback(() => {
    pausedByUs.current = Date.now();
    controller.current?.pause();
  }, []);

  return { holder, state, toggle, pause };
}

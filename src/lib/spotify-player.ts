"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Whole songs through Spotify's Web Playback SDK. This browser tab becomes a
// Spotify device ("posted. record player"); pressing play starts the record on
// it using your own connected account. Needs Premium and a desktop browser.

type SdkState = { paused: boolean; position: number; duration: number; track_window: { current_track: { uri: string } | null } };
type SdkPlayer = {
  connect: () => Promise<boolean>;
  disconnect: () => void;
  addListener: (event: string, cb: (payload: never) => void) => void;
  togglePlay: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  getCurrentState: () => Promise<SdkState | null>;
  activateElement: () => Promise<void>;
};
declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: { Player: new (opts: { name: string; getOAuthToken: (cb: (t: string) => void) => void; volume?: number }) => SdkPlayer };
    __spotifySdk?: Promise<void>;
  }
}

function loadSdk(): Promise<void> {
  if (window.Spotify) return Promise.resolve();
  if (window.__spotifySdk) return window.__spotifySdk;
  window.__spotifySdk = new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = () => resolve();
    const s = document.createElement("script");
    s.src = "https://sdk.scdn.co/spotify-player.js";
    s.async = true;
    s.onerror = () => reject(new Error("Spotify's player didn't load"));
    document.body.appendChild(s);
  });
  return window.__spotifySdk;
}

let cached: { token: string; expiresAt: number } | null = null;
async function accessToken(): Promise<string | null> {
  if (cached && cached.expiresAt - Date.now() > 60_000) return cached.token;
  const res = await fetch("/api/spotify/token", { cache: "no-store" });
  if (!res.ok) return null;
  const d = (await res.json()) as { accessToken: string; expiresAt: number };
  cached = { token: d.accessToken, expiresAt: d.expiresAt };
  return d.accessToken;
}

export type FullPlayerState = {
  /** The player is connected and can play. */
  ready: boolean;
  /** Why it can't: Spotify refused the account (usually not Premium), the browser isn't supported, or sign-in expired. */
  problem: "not-premium" | "unsupported" | "signed-out" | "protected-content" | "error" | null;
  playing: boolean;
  /** 0–1 */
  progress: number;
};

export function useSpotifyPlayer(enabled: boolean) {
  const player = useRef<SdkPlayer | null>(null);
  const deviceId = useRef<string | null>(null);
  const loadedUri = useRef<string | null>(null);
  const [state, setState] = useState<FullPlayerState>({ ready: false, problem: null, playing: false, progress: 0 });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadSdk()
      .then(() => {
        if (cancelled || !window.Spotify) return;
        const p = new window.Spotify.Player({
          name: "posted. record player",
          volume: 0.8,
          getOAuthToken: (cb) => {
            accessToken().then((t) => (t ? cb(t) : setState((s) => ({ ...s, ready: false, problem: "signed-out" }))));
          },
        });
        const fail = (problem: FullPlayerState["problem"]) => () => setState((s) => ({ ...s, ready: false, problem }));
        p.addListener("ready", (({ device_id }: { device_id: string }) => {
          deviceId.current = device_id;
          setState((s) => ({ ...s, ready: true, problem: null }));
        }) as never);
        p.addListener("not_ready", (() => setState((s) => ({ ...s, ready: false }))) as never);
        p.addListener("account_error", fail("not-premium") as never);
        p.addListener("initialization_error", fail("unsupported") as never);
        p.addListener("authentication_error", (() => {
          cached = null;
          setState((s) => ({ ...s, ready: false, problem: "signed-out" }));
        }) as never);
        // Spotify couldn't decode the song (Chrome's protected content / Widevine), or the browser blocked sound.
        p.addListener("playback_error", (({ message }: { message: string }) => {
          console.error("Spotify playback error:", message);
          setState((s) => ({ ...s, problem: /eme|drm|widevine|protected|decrypt|key/i.test(message) ? "protected-content" : "error" }));
        }) as never);
        p.addListener("autoplay_failed", (() => setState((s) => ({ ...s, playing: false }))) as never);
        p.addListener("player_state_changed", ((st: SdkState | null) => {
          if (!st) return setState((s) => ({ ...s, playing: false }));
          loadedUri.current = st.track_window.current_track ? loadedUri.current : null;
          setState((s) => ({ ...s, playing: !st.paused, progress: st.duration ? st.position / st.duration : 0 }));
        }) as never);
        p.connect();
        player.current = p;
      })
      .catch(() => !cancelled && setState((s) => ({ ...s, problem: "unsupported" })));
    return () => {
      cancelled = true;
      player.current?.disconnect();
      player.current = null;
    };
  }, [enabled]);

  // The SDK only reports position on changes, so tick the progress bar while playing.
  useEffect(() => {
    if (!state.playing) return;
    const t = window.setInterval(async () => {
      const st = await player.current?.getCurrentState();
      if (st) setState((s) => ({ ...s, progress: st.duration ? st.position / st.duration : 0, playing: !st.paused }));
    }, 1000);
    return () => window.clearInterval(t);
  }, [state.playing]);

  /** Plays `uri` from the start, or pauses/resumes it if it's already the one loaded. Call from a click. */
  const toggle = useCallback(async (uri: string): Promise<boolean> => {
    const p = player.current;
    if (!p || !deviceId.current) return false;
    // Browsers only allow sound that starts from a click; this unlocks it.
    await p.activateElement().catch(() => {});
    if (loadedUri.current === uri) {
      await p.togglePlay();
      return true;
    }
    const token = await accessToken();
    if (!token) return false;
    const body = uri.startsWith("spotify:track:") ? { uris: [uri] } : { context_uri: uri };
    const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId.current)}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 403) {
      setState((s) => ({ ...s, problem: "not-premium" }));
      return false;
    }
    if (!res.ok) return false;
    loadedUri.current = uri;
    return true;
  }, []);

  const pause = useCallback(() => {
    player.current?.pause().catch(() => {});
  }, []);

  /** A different record went on: the next play starts it fresh. */
  const reset = useCallback(() => {
    player.current?.pause().catch(() => {});
    loadedUri.current = null;
    setState((s) => ({ ...s, playing: false, progress: 0 }));
  }, []);

  return { state, toggle, pause, reset };
}

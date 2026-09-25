"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = { configured: boolean; connected: boolean; premium: boolean };

/** Connect or disconnect your own Spotify, for whole songs on the record player. */
export function SpotifyConnect({ configured, connected, premium }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (!configured) {
    return <p className="hint">Spotify isn&rsquo;t set up for this site yet. It needs a Spotify app&rsquo;s client ID and secret in the site&rsquo;s settings.</p>;
  }
  if (!connected) {
    return (
      <div className="settings-actions">
        <a className="btn" href="/api/spotify/login?back=/settings%23spotify">Connect Spotify</a>
        <span className="hint">Plays whole songs on the record player. Needs Spotify Premium, and a computer browser.</span>
      </div>
    );
  }
  return (
    <div className="settings-actions">
      <span>{premium ? "Connected. The record player plays whole songs." : "Connected, but this account isn't Premium, so Spotify only allows previews here."}</span>
      <button
        type="button"
        className="btn btn-quiet"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          await fetch("/api/spotify/disconnect", { method: "POST" });
          setBusy(false);
          router.refresh();
        }}
      >
        Disconnect
      </button>
    </div>
  );
}

const NOTICES: Record<string, string> = {
  connected: "Spotify is connected. Press play on the record player for the whole song.",
  "not-premium": "Spotify is connected, but it says this account isn't Premium, so only previews can play here.",
  cancelled: "Spotify wasn't connected. You can try again any time.",
  failed: "Spotify didn't connect. Try again. If it keeps happening, check that your Spotify email is added under User Management in the Spotify app.",
  unconfigured: "Spotify isn't set up for this site yet.",
};

/** The result of connecting Spotify, shown once when you come back from Spotify's sign-in. */
export function SpotifyNotice({ status }: { status?: string | string[] }) {
  const text = typeof status === "string" ? NOTICES[status] : undefined;
  if (!text) return null;
  const ok = status === "connected";
  return <p className={ok ? "hint jukebox-note" : "error-note"}>{ok ? text : <b>{text}</b>}</p>;
}

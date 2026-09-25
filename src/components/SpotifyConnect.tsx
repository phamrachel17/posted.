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

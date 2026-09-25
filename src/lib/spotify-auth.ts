import "server-only";
import { createClient } from "./supabase/server";

// Spotify sign-in for the record player. Authorization-code flow on the server,
// so the client secret and refresh token never reach the browser.

export const SPOTIFY_SCOPES = [
  "streaming", // play in the browser (Web Playback SDK)
  "user-read-email",
  "user-read-private", // tells us if the account is Premium
  "user-modify-playback-state",
  "user-read-playback-state",
].join(" ");

export function spotifyConfigured() {
  return Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

export function redirectUri(origin: string) {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || origin).replace(/\/$/, "");
  return `${base}/api/spotify/callback`;
}

function basicAuth() {
  return "Basic " + Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64");
}

type TokenResponse = { access_token: string; refresh_token?: string; expires_in: number };

async function tokenRequest(body: Record<string, string>): Promise<TokenResponse | null> {
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: { Authorization: basicAuth(), "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
    cache: "no-store",
  });
  if (!res.ok) {
    console.error("Spotify token request failed:", res.status, await res.text().catch(() => ""));
    return null;
  }
  return res.json();
}

export function exchangeCode(code: string, redirect: string) {
  return tokenRequest({ grant_type: "authorization_code", code, redirect_uri: redirect });
}

/** Your Spotify access token, refreshed if it's about to expire. Null if you haven't connected. */
export async function spotifyAccessToken(): Promise<{ token: string; expiresAt: number; product: string | null } | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return null;

  const { data: row } = await supabase
    .from("spotify_accounts")
    .select("refresh_token, access_token, expires_at, product")
    .eq("user_id", userId)
    .maybeSingle();
  if (!row) return null;

  const expiresAt = row.expires_at ? Date.parse(row.expires_at) : 0;
  if (row.access_token && expiresAt - Date.now() > 60_000) return { token: row.access_token, expiresAt, product: row.product };

  const fresh = await tokenRequest({ grant_type: "refresh_token", refresh_token: row.refresh_token });
  if (!fresh) return null;
  const next = Date.now() + fresh.expires_in * 1000;
  await supabase
    .from("spotify_accounts")
    .update({
      access_token: fresh.access_token,
      expires_at: new Date(next).toISOString(),
      // Spotify sometimes rotates the refresh token.
      ...(fresh.refresh_token ? { refresh_token: fresh.refresh_token } : {}),
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  return { token: fresh.access_token, expiresAt: next, product: row.product };
}

/** Whether you've connected Spotify, and whether it can play whole songs here. */
export async function spotifyStatus(): Promise<{ configured: boolean; connected: boolean; premium: boolean }> {
  if (!spotifyConfigured()) return { configured: false, connected: false, premium: false };
  const supabase = await createClient();
  const { data } = await supabase.from("spotify_accounts").select("product").maybeSingle();
  return { configured: true, connected: Boolean(data), premium: data?.product === "premium" };
}

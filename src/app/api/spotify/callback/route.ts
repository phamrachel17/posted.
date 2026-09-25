import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { exchangeCode, redirectUri } from "@/lib/spotify-auth";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const back = request.cookies.get("spotify_back")?.value ?? "/";
  const done = (status: string) => {
    const url = new URL(back, request.url);
    url.searchParams.set("spotify", status);
    const res = NextResponse.redirect(url);
    res.cookies.delete({ name: "spotify_state", path: "/api/spotify" });
    res.cookies.delete({ name: "spotify_back", path: "/api/spotify" });
    return res;
  };

  const state = params.get("state");
  if (!state || state !== request.cookies.get("spotify_state")?.value) return done("failed");
  const code = params.get("code");
  if (!code) return done(params.get("error") === "access_denied" ? "cancelled" : "failed");

  const tokens = await exchangeCode(code, redirectUri(request.nextUrl.origin));
  if (!tokens?.refresh_token) return done("failed");

  // Premium is what lets Spotify play whole songs in a browser.
  const me = await fetch("https://api.spotify.com/v1/me", { headers: { Authorization: `Bearer ${tokens.access_token}` }, cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null);

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return done("failed");
  const { error } = await supabase.from("spotify_accounts").upsert({
    user_id: userId,
    refresh_token: tokens.refresh_token,
    access_token: tokens.access_token,
    expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
    product: (me?.product as string | undefined) ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) return done("failed");
  return done(me?.product === "premium" ? "connected" : "not-premium");
}

import { NextResponse, type NextRequest } from "next/server";
import { redirectUri, SPOTIFY_SCOPES, spotifyConfigured } from "@/lib/spotify-auth";

// Starts "Connect Spotify". The state cookie proves the callback came from this browser.
export async function GET(request: NextRequest) {
  if (!spotifyConfigured()) return NextResponse.redirect(new URL("/settings?spotify=unconfigured#spotify", request.url));
  // Spotify returns to the site address; start there too, or the check cookie won't come back.
  const site = process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL).origin : null;
  if (site && site !== request.nextUrl.origin) {
    return NextResponse.redirect(new URL(request.nextUrl.pathname + request.nextUrl.search, site));
  }
  const state = crypto.randomUUID();
  const back = request.nextUrl.searchParams.get("back");
  const url = new URL("https://accounts.spotify.com/authorize");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: process.env.SPOTIFY_CLIENT_ID!,
    scope: SPOTIFY_SCOPES,
    redirect_uri: redirectUri(request.nextUrl.origin),
    state,
  }).toString();
  const res = NextResponse.redirect(url);
  const cookie = { httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "lax" as const, path: "/api/spotify", maxAge: 600 };
  res.cookies.set("spotify_state", state, cookie);
  // Only ever send people back to a page on this site.
  if (back && back.startsWith("/") && !back.startsWith("//")) res.cookies.set("spotify_back", back, cookie);
  return res;
}

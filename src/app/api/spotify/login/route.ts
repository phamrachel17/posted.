import { NextResponse, type NextRequest } from "next/server";
import { redirectUri, SPOTIFY_SCOPES, spotifyConfigured } from "@/lib/spotify-auth";

// Starts "Connect Spotify". The state cookie proves the callback came from this browser.
export async function GET(request: NextRequest) {
  if (!spotifyConfigured()) return NextResponse.redirect(new URL("/settings?spotify=unconfigured#spotify", request.url));
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

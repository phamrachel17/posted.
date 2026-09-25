import { NextResponse } from "next/server";
import { spotifyAccessToken } from "@/lib/spotify-auth";

// The record player asks for a short-lived token to play through Spotify.
export async function GET() {
  const t = await spotifyAccessToken();
  if (!t) return NextResponse.json({ connected: false }, { status: 401 });
  return NextResponse.json({ connected: true, accessToken: t.token, expiresAt: t.expiresAt, premium: t.product === "premium" }, { headers: { "Cache-Control": "no-store" } });
}

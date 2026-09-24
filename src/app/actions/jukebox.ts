"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUs } from "@/lib/data";
import { parseSpotify, spotifyMeta } from "@/lib/spotify";

/** Puts a song on the record player for both of you, from a pasted Spotify link. */
export async function putOnSong(link: string): Promise<{ error?: string }> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };

  const ref = parseSpotify(link);
  if (!ref) return { error: "That isn't a Spotify link. In Spotify, tap Share → Copy link, then paste it here." };

  const meta = await spotifyMeta(ref);
  if (!meta) return { error: "Spotify didn't recognize that link. Check it and try again." };

  const supabase = await createClient();
  const song = {
    space_id: us.space.id,
    kind: ref.kind,
    spotify_id: ref.id,
    title: meta.title.slice(0, 200),
    artist: meta.artist?.slice(0, 200) ?? null,
    image: meta.image,
    set_by: us.me.id,
  };
  let { error } = await supabase.from("jukebox_songs").insert({ ...song, preview: meta.preview });
  // Before the preview migration runs, save the song without it.
  if (error && /preview/.test(error.message)) ({ error } = await supabase.from("jukebox_songs").insert(song));
  if (error) return { error: "The song didn't get put on. Try again." };
  revalidatePath("/");
  return {};
}

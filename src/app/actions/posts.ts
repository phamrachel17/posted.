"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUs } from "@/lib/data";
import { MAX_DAY_NOTE } from "@/lib/day";
import { validStamp } from "./stamps";
import { EMOJI, type DayMeta, type Emoji, type Mood } from "@/lib/types";

export type NewPhoto = { path: string; width: number; height: number; mime: string };
export type NewAudio = { path: string; mime: string; duration_ms: number; peaks: number[] };

type Result = { error?: string; id?: string };

const MAX_PHOTOS = 6;
const MAX_VOICE_MS = 5 * 60 * 1000 + 2000;
const MOODS: Mood[] = ["happy", "calm", "okay", "tired", "stressed", "down"];
const AUDIO_MIMES = ["audio/webm", "audio/mp4", "audio/ogg", "audio/mpeg"];

function refresh() {
  revalidatePath("/", "layout");
}

function validAudio(audio: NewAudio, spaceId: string) {
  return (
    audio.path.startsWith(`${spaceId}/`) &&
    AUDIO_MIMES.includes(audio.mime) &&
    audio.duration_ms > 0 &&
    audio.duration_ms <= MAX_VOICE_MS &&
    Array.isArray(audio.peaks) &&
    audio.peaks.length <= 128
  );
}

function audioMedia(audio: NewAudio) {
  return {
    type: "audio",
    path: audio.path,
    mime: audio.mime,
    duration_ms: Math.round(audio.duration_ms),
    peaks: audio.peaks.map((p) => Math.max(0, Math.min(100, Math.round(p)))),
  };
}

function cleanDay(meta: DayMeta): DayMeta | null {
  const mood = meta.mood && MOODS.includes(meta.mood) ? meta.mood : undefined;
  const text = (v: unknown, max = 1000) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);
  const note = text(meta.note, MAX_DAY_NOTE);
  // A day needs a mood or a note; everything else is optional.
  if (!mood && !note) return null;
  const energy = typeof meta.energy === "number" && meta.energy >= 1 && meta.energy <= 5 ? Math.round(meta.energy) : undefined;
  return {
    mood,
    energy,
    highlight: text(meta.highlight),
    accomplished: text(meta.accomplished),
    grateful: text(meta.grateful),
    note,
  };
}

export async function createPost(input: {
  body: string;
  notebookId?: string | null;
  photos?: NewPhoto[];
  audio?: NewAudio | null;
  day?: DayMeta | null;
  /** For a My day: which day it's about ("YYYY-MM-DD"). The database only honors recent past days. */
  dayDate?: string;
  /** The postage stamp, for posts to Today: "design:<id>" or "photo:<path>". */
  stamp?: string | null;
}): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again to post." };

  const body = input.body.trim();
  const photos = (input.photos ?? []).slice(0, MAX_PHOTOS);
  const audio = input.audio ?? null;
  const day = input.day ? cleanDay(input.day) : null;

  if (input.day && !day) return { error: "Pick a mood or write a note for your day." };
  if (day && input.notebookId) return { error: "My day posts go to Today, not a notebook." };
  if (!body && !photos.length && !audio && !day) return { error: "Write something or add a photo first." };
  if (body.length > 10_000) return { error: "That's longer than a post can be. Try splitting it in two." };
  if (photos.some((p) => !p.path.startsWith(`${us.space.id}/`))) return { error: "One of those photos didn't upload. Remove it and try again." };
  if (audio && !validAudio(audio, us.space.id)) return { error: "That voice memo didn't upload properly. Record it again." };

  const kind = day ? "day" : audio ? "voice" : photos.length ? "photo" : "note";
  const media = [
    ...photos.map((p) => ({ type: "photo", path: p.path, mime: p.mime, width: p.width, height: p.height })),
    ...(audio ? [audioMedia(audio)] : []),
  ];

  // A bad stamp is dropped rather than blocking the post (it then shows your city's).
  const stamp = input.stamp ? await validStamp(input.stamp, us.space.id, us.me.city) : null;
  const meta = {
    ...(day ?? {}),
    ...(day && input.dayDate && /^\d{4}-\d{2}-\d{2}$/.test(input.dayDate) ? { day: input.dayDate } : {}),
    ...(stamp ? { stamp } : {}),
  };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_post", {
    p_kind: kind,
    p_body: body,
    p_notebook_id: input.notebookId || null,
    p_meta: meta,
    p_media: media,
  });
  if (error) return { error: "Your post didn't go through. It's still here, so try again." };

  refresh();
  return { id: data as string };
}

export async function updateDay(postId: string, meta: DayMeta, dayDate: string): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again to edit." };
  const day = cleanDay(meta);
  if (!day) return { error: "Pick a mood or write a note for your day." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayDate)) return { error: "Pick which day this is for." };

  const supabase = await createClient();
  // Editing a day keeps the stamp it was sent with.
  const { data: current } = await supabase.from("posts").select("meta").eq("id", postId).eq("author_id", us.me.id).maybeSingle();
  const stamp = (current?.meta as { stamp?: string } | undefined)?.stamp;
  const { error } = await supabase.rpc("update_day", { p_post_id: postId, p_meta: stamp ? { ...day, stamp } : day, p_day: dayDate });
  if (error) return { error: error.code === "P0001" ? error.message : "Your changes didn't save. Try again." };
  refresh();
  return {};
}

export async function updatePostBody(id: string, body: string): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again to edit." };
  if (body.length > 10_000) return { error: "That's longer than a post can be." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("posts")
    .update({ body: body.trim() || null, edited_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", us.me.id);
  if (error) return { error: "Your edit didn't save. Try again." };
  refresh();
  return {};
}

export async function deletePost(formData: FormData) {
  const us = await getUs();
  if (!us) return;
  const id = String(formData.get("id") ?? "");

  const supabase = await createClient();
  // RLS only lets you update your own posts; the author filter makes that explicit.
  await supabase.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("author_id", us.me.id);
  refresh();
  // Deleting from the post's own page goes back to Today.
  if (formData.get("leave") === "1") redirect("/");
}

export async function createReply(input: { postId: string; body: string; audio?: NewAudio | null }): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again to write back." };

  const body = input.body.trim();
  const audio = input.audio ?? null;
  if (!body && !audio) return { error: "Write something or record a memo first." };
  if (body.length > 5000) return { error: "That's a long note. Try splitting it in two." };
  if (audio && !validAudio(audio, us.space.id)) return { error: "That voice memo didn't upload properly. Record it again." };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_reply", {
    p_post_id: input.postId,
    p_body: body,
    p_media: audio ? [audioMedia(audio)] : [],
  });
  if (error) return { error: "Your note didn't go through. It's still here, so try again." };
  refresh();
  return { id: data as string };
}

export async function updateReplyBody(id: string, body: string): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again to edit." };
  if (body.length > 5000) return { error: "That's a long note. Try splitting it in two." };
  if (!body.trim()) return { error: "A note can't be empty. Delete it instead." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("replies")
    .update({ body: body.trim(), edited_at: new Date().toISOString() })
    .eq("id", id)
    .eq("author_id", us.me.id);
  if (error) return { error: "Your edit didn't save. Try again." };
  refresh();
  return {};
}

export async function deleteReply(formData: FormData) {
  const us = await getUs();
  if (!us) return;
  const id = String(formData.get("id") ?? "");
  const supabase = await createClient();
  await supabase.from("replies").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("author_id", us.me.id);
  refresh();
}

export async function toggleReaction(target: { postId?: string; replyId?: string }, emoji: Emoji, on: boolean): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };
  if (!EMOJI.includes(emoji) || Boolean(target.postId) === Boolean(target.replyId)) return { error: "That reaction isn't available." };

  const supabase = await createClient();
  if (on) {
    const { error } = await supabase.from("reactions").insert({
      space_id: us.space.id,
      member_id: us.me.id,
      post_id: target.postId ?? null,
      reply_id: target.replyId ?? null,
      emoji,
    });
    // A duplicate means it's already there, which is the state we wanted.
    if (error && error.code !== "23505") return { error: "That didn't save. Try again." };
  } else {
    let del = supabase.from("reactions").delete().eq("member_id", us.me.id).eq("emoji", emoji);
    del = target.postId ? del.eq("post_id", target.postId) : del.eq("reply_id", target.replyId!);
    const { error } = await del;
    if (error) return { error: "That didn't save. Try again." };
  }
  refresh();
  return {};
}

export async function setKept(postId: string, kept: boolean): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };
  const supabase = await createClient();
  const { error } = kept
    ? await supabase.from("keeps").upsert({ member_id: us.me.id, post_id: postId }, { onConflict: "member_id,post_id", ignoreDuplicates: true })
    : await supabase.from("keeps").delete().eq("member_id", us.me.id).eq("post_id", postId);
  if (error) return { error: "That didn't save. Try again." };
  refresh();
  return {};
}

export async function setKeptNote(postId: string, note: string): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("keeps")
    .update({ note: note.trim().slice(0, 140) || null })
    .eq("member_id", us.me.id)
    .eq("post_id", postId);
  if (error) return { error: "Your note didn't save. Try again." };
  revalidatePath("/kept");
  return {};
}

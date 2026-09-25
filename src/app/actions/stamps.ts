"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUs } from "@/lib/data";
import { isStampPath, parseStamp, type BookStamp } from "@/lib/stamps";

type Result<T = object> = T & { error?: string };

/** Puts an uploaded photo in the shared stamp book. */
export async function addStamp(path: string): Promise<Result<{ stamp?: BookStamp }>> {
  const us = await getUs();
  if (!us) return { error: "Sign in again to add a stamp." };
  if (!isStampPath(path, us.space.id)) return { error: "That stamp didn't upload properly. Try again." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("stamps")
    .insert({ space_id: us.space.id, added_by: us.me.id, path })
    .select("id")
    .single();
  if (error) return { error: "That stamp didn't save. Try again." };
  const { data: signed } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 6);
  revalidatePath("/", "layout");
  return { stamp: { id: data.id as string, path, url: signed?.signedUrl ?? null, addedBy: us.me.id } };
}

/** Takes one of your photos out of the book. Posts already sent with it keep it. */
export async function removeStamp(id: string): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };
  const supabase = await createClient();
  const { data } = await supabase.from("stamps").select("path").eq("id", id).eq("added_by", us.me.id).maybeSingle();
  const { error } = await supabase.from("stamps").delete().eq("id", id).eq("added_by", us.me.id);
  if (error) return { error: "That stamp didn't come out. Try again." };
  // If it was your default, go back to the first design.
  if (data && us.me.stamp === `photo:${data.path}`) await supabase.from("members").update({ stamp: null }).eq("id", us.me.id);
  revalidatePath("/", "layout");
  return {};
}

/** Checks a stamp is a real design or a photo in this space's book. */
export async function validStamp(value: unknown, spaceId: string): Promise<string | null> {
  const s = parseStamp(value);
  if (!s) return null;
  if (s.kind === "design") return `design:${s.id}`;
  if (!isStampPath(s.path, spaceId)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("stamps").select("id").eq("path", s.path).maybeSingle();
  return data ? `photo:${s.path}` : null;
}

export async function setDefaultStamp(value: string): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };
  const stamp = await validStamp(value, us.space.id);
  if (!stamp) return { error: "Pick one of the stamps." };
  const supabase = await createClient();
  const { error } = await supabase.from("members").update({ stamp }).eq("id", us.me.id);
  if (error) return { error: "Your stamp didn't save. Try again." };
  revalidatePath("/", "layout");
  return {};
}

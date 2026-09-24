"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUs } from "@/lib/data";

type Result = { error?: string; id?: string };

function refresh() {
  revalidatePath("/bucket-list");
  revalidatePath("/");
}

export async function addBucketItem(body: string): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };
  const text = body.trim().slice(0, 200);
  if (!text) return { error: "Write something to add." };
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("bucket_items")
    .insert({ space_id: us.space.id, body: text, added_by: us.me.id })
    .select("id")
    .single();
  if (error) return { error: "That didn't get added. Try again." };
  refresh();
  return { id: data.id };
}

/** Checking off is always recorded as whoever did it. */
export async function setBucketDone(id: string, done: boolean): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("bucket_items")
    .update(done ? { done_by: us.me.id, done_at: new Date().toISOString() } : { done_by: null, done_at: null })
    .eq("id", id);
  if (error) return { error: "That didn't save. Try again." };
  refresh();
  return {};
}

export async function editBucketItem(id: string, body: string): Promise<Result> {
  if (!(await getUs())) return { error: "Sign in again." };
  const text = body.trim().slice(0, 200);
  if (!text) return { error: "It can't be empty. Remove it instead." };
  const supabase = await createClient();
  const { error } = await supabase.from("bucket_items").update({ body: text }).eq("id", id);
  if (error) return { error: "Your edit didn't save. Try again." };
  refresh();
  return {};
}

export async function deleteBucketItem(id: string): Promise<Result> {
  if (!(await getUs())) return { error: "Sign in again." };
  const supabase = await createClient();
  const { error } = await supabase.from("bucket_items").delete().eq("id", id);
  if (error) return { error: "That didn't get removed. Try again." };
  refresh();
  return {};
}

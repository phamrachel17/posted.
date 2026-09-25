"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getLessons, getUs } from "@/lib/data";
import { COVERS, slugify } from "@/lib/notebooks";
import { dayKey } from "@/lib/time";
import type { FormState } from "@/lib/forms";
import type { LessonMeta } from "@/lib/types";

function readNotebook(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const cover = String(formData.get("cover") ?? "stone");
  const doodleFile = String(formData.get("doodle") ?? "");
  const doodleText = String(formData.get("doodle_text") ?? "").trim();
  const doodle = doodleFile === "text" ? (doodleText ? `text:${[...doodleText].slice(0, 2).join("")}` : null) : doodleFile || null;

  if (!name) return { error: "Give the notebook a name." };
  if (name.length > 40) return { error: "Keep the name under 40 characters." };
  if (description.length > 140) return { error: "Keep the line under 140 characters." };
  if (!(cover in COVERS)) return { error: "Pick a cover color." };
  if (doodle && !/^(nb-[a-z0-9-]+|text:.+)$/u.test(doodle)) return { error: "Pick a doodle." };
  return { name, description: description || null, cover, doodle };
}

async function uniqueSlug(name: string, exceptId?: string) {
  const supabase = await createClient();
  const base = slugify(name);
  const { data } = await supabase.from("notebooks").select("id, slug").like("slug", `${base}%`);
  const taken = new Set((data ?? []).filter((n) => n.id !== exceptId).map((n) => n.slug));
  if (!taken.has(base)) return base;
  let i = 2;
  while (taken.has(`${base}-${i}`)) i++;
  return `${base}-${i}`;
}

export async function createNotebook(_prev: FormState, formData: FormData): Promise<FormState> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };
  const input = readNotebook(formData);
  if ("error" in input) return input;

  const slug = await uniqueSlug(input.name);
  const supabase = await createClient();
  const { error } = await supabase.from("notebooks").insert({
    space_id: us.space.id,
    created_by: us.me.id,
    slug,
    kind: formData.get("lessons") === "on" ? "lessons" : "plain",
    ...input,
  });
  if (error) return { error: "The notebook wasn't created. Try again." };
  revalidatePath("/", "layout");
  redirect(`/n/${slug}`);
}

export async function updateNotebook(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };
  const input = readNotebook(formData);
  if ("error" in input) return input;

  const slug = await uniqueSlug(input.name, id);
  const supabase = await createClient();
  const { error } = await supabase
    .from("notebooks")
    .update({ ...input, slug, kind: formData.get("lessons") === "on" ? "lessons" : "plain" })
    .eq("id", id);
  if (error) return { error: "Your changes didn't save. Try again." };
  revalidatePath("/", "layout");
  redirect(`/n/${slug}`);
}

export async function archiveNotebook(formData: FormData) {
  const us = await getUs();
  if (!us) return;
  const supabase = await createClient();
  await supabase.from("notebooks").update({ archived_at: new Date().toISOString() }).eq("id", String(formData.get("id")));
  revalidatePath("/", "layout");
  redirect("/notebooks");
}

/** Deleting a notebook never deletes posts: they move to "Today only". */
export async function deleteNotebook(formData: FormData) {
  const us = await getUs();
  if (!us) return;
  const supabase = await createClient();
  await supabase.from("notebooks").delete().eq("id", String(formData.get("id")));
  revalidatePath("/", "layout");
  redirect("/notebooks");
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

/** The coming Sunday (or today, if it's Sunday) in a time zone. */
function nextSunday(timeZone: string) {
  const today = dayKey(new Date(), timeZone);
  const [y, m, d] = today.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + ((7 - date.getUTCDay()) % 7));
  return date.toISOString().slice(0, 10);
}

export async function createLesson(formData: FormData) {
  const us = await getUs();
  if (!us) return;
  const notebookId = String(formData.get("notebook_id"));
  const slug = String(formData.get("slug"));

  const lessons = await getLessons(notebookId);
  const previous = lessons[0];
  const carried = previous?.meta.questions?.filter((q) => !q.answered) ?? [];

  const meta: LessonMeta = {
    n: (previous?.meta.n ?? 0) + 1,
    date: nextSunday(us.me.timezone),
    teacher_id: previous?.meta.teacher_id ?? us.me.id,
    topics: [],
    vocab: [],
    homework: [],
    questions: carried,
  };

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_post", {
    p_kind: "lesson",
    p_body: "",
    p_notebook_id: notebookId,
    p_meta: meta,
    p_media: [],
  });
  if (error) return;

  // Unanswered questions move forward instead of being copied.
  if (previous && carried.length) {
    await supabase.rpc("update_lesson", {
      p_post_id: previous.id,
      p_meta: { ...previous.meta, questions: previous.meta.questions.filter((q) => q.answered) },
    });
  }
  revalidatePath("/", "layout");
  redirect(`/n/${slug}/lessons/${meta.n}`);
}

/** Delete a lesson you created. Its unanswered questions move to the newest lesson left, so they aren't lost. */
export async function deleteLesson(formData: FormData) {
  const us = await getUs();
  if (!us) return;
  const id = String(formData.get("id") ?? "");
  const slug = String(formData.get("slug") ?? "");

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("posts")
    .select("id, notebook_id, meta")
    .eq("id", id)
    .eq("kind", "lesson")
    .eq("author_id", us.me.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!lesson?.notebook_id) return;

  const { error } = await supabase.from("posts").update({ deleted_at: new Date().toISOString() }).eq("id", id).eq("author_id", us.me.id);
  if (error) return;

  const open = ((lesson.meta as LessonMeta).questions ?? []).filter((q) => !q.answered);
  const newest = (await getLessons(lesson.notebook_id))[0];
  if (open.length && newest) {
    await supabase.rpc("update_lesson", {
      p_post_id: newest.id,
      p_meta: { ...newest.meta, questions: [...(newest.meta.questions ?? []), ...open] },
    });
  }
  revalidatePath("/", "layout");
  redirect(`/n/${encodeURIComponent(slug)}`);
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function saveLesson(postId: string, meta: LessonMeta): Promise<{ error?: string }> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };
  const memberIds = new Set([us.me.id, us.partner?.id].filter(Boolean));

  const clean: LessonMeta = {
    n: Math.max(1, Math.round(Number(meta.n) || 1)),
    date: /^\d{4}-\d{2}-\d{2}$/.test(meta.date) ? meta.date : nextSunday(us.me.timezone),
    teacher_id: meta.teacher_id && memberIds.has(meta.teacher_id) ? meta.teacher_id : null,
    topics: (meta.topics ?? []).map((t) => str(t, 60)).filter(Boolean).slice(0, 20),
    vocab: (meta.vocab ?? [])
      .map((v) => ({ term: str(v.term, 120), meaning: str(v.meaning, 200), note: str(v.note, 200) || undefined }))
      .filter((v) => v.term || v.meaning)
      .slice(0, 200),
    homework: (meta.homework ?? [])
      .map((h) => ({ text: str(h.text, 200), done_by: h.done_by && memberIds.has(h.done_by) ? h.done_by : null }))
      .filter((h) => h.text)
      .slice(0, 50),
    questions: (meta.questions ?? [])
      .map((q) => ({ text: str(q.text, 500), by: memberIds.has(q.by) ? q.by : us.me.id, answered: Boolean(q.answered) }))
      .filter((q) => q.text)
      .slice(0, 50),
    notes: str(meta.notes, 5000) || undefined,
  };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_lesson", { p_post_id: postId, p_meta: clean });
  if (error) return { error: "The lesson didn't save. Try again." };
  revalidatePath("/", "layout");
  return {};
}

/** Called when you open a notebook, so its "new" dot clears. */
export async function markNotebookRead(notebookId: string) {
  const us = await getUs();
  if (!us) return;
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_notebook_read", { p_notebook_id: notebookId });
  if (!error) revalidatePath("/", "layout");
}

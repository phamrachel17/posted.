"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUs } from "@/lib/data";
import type { PieceKind } from "@/lib/data";

type Result = { error?: string; id?: string };

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : lo));

async function touch(pageId: string) {
  const supabase = await createClient();
  await supabase.from("scrapbook_pages").update({ updated_at: new Date().toISOString() }).eq("id", pageId);
}

export async function createScrapPage() {
  const us = await getUs();
  if (!us) return;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scrapbook_pages")
    .insert({ space_id: us.space.id, created_by: us.me.id, title: "Untitled page" })
    .select("id")
    .single();
  if (error) return;
  revalidatePath("/scrapbook/pages");
  redirect(`/scrapbook/pages/${data.id}`);
}

export async function renameScrapPage(id: string, title: string): Promise<Result> {
  if (!(await getUs())) return { error: "Sign in again." };
  const clean = title.trim().slice(0, 80) || "Untitled page";
  const supabase = await createClient();
  const { error } = await supabase.from("scrapbook_pages").update({ title: clean, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) return { error: "The title didn't save. Try again." };
  revalidatePath("/scrapbook/pages");
  return {};
}

export async function deleteScrapPage(formData: FormData) {
  if (!(await getUs())) return;
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const { data: pieces } = await supabase.from("scrapbook_pieces").select("path").eq("page_id", id).not("path", "is", null);
  await supabase.from("scrapbook_pages").delete().eq("id", id);
  const paths = (pieces ?? []).map((p) => p.path as string);
  if (paths.length) await supabase.storage.from("media").remove(paths);
  revalidatePath("/scrapbook/pages");
  redirect("/scrapbook/pages");
}

export type NewPiece = {
  kind: PieceKind;
  path?: string;
  mime?: string;
  width?: number;
  height?: number;
  duration_ms?: number;
  sticker?: string;
  body?: string;
  color?: string;
  x: number;
  y: number;
  w: number;
  rotation: number;
  z: number;
};

export async function addPiece(pageId: string, piece: NewPiece): Promise<Result> {
  const us = await getUs();
  if (!us) return { error: "Sign in again." };
  if (piece.path && !piece.path.startsWith(`${us.space.id}/`)) return { error: "That upload didn't work. Try again." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("scrapbook_pieces")
    .insert({
      space_id: us.space.id,
      page_id: pageId,
      created_by: us.me.id,
      kind: piece.kind,
      path: piece.path ?? null,
      mime: piece.mime ?? null,
      width: piece.width ? Math.round(piece.width) : null,
      height: piece.height ? Math.round(piece.height) : null,
      duration_ms: piece.duration_ms ? Math.round(piece.duration_ms) : null,
      sticker: piece.sticker?.slice(0, 60) ?? null,
      body: piece.body?.slice(0, 300) ?? null,
      color: piece.color?.slice(0, 20) ?? null,
      x: clamp(piece.x, -50, 150),
      y: clamp(piece.y, -50, 150),
      w: clamp(piece.w, 3, 100),
      rotation: clamp(piece.rotation, -180, 180),
      z: Math.round(piece.z),
    })
    .select("id")
    .single();
  if (error) return { error: "That didn't get added. Try again." };
  await touch(pageId);
  return { id: data.id };
}

export async function updatePiece(
  pageId: string,
  id: string,
  patch: Partial<Pick<NewPiece, "x" | "y" | "w" | "rotation" | "z" | "body" | "color">>,
): Promise<Result> {
  if (!(await getUs())) return { error: "Sign in again." };
  const clean: Record<string, unknown> = {};
  if (patch.x !== undefined) clean.x = clamp(patch.x, -50, 150);
  if (patch.y !== undefined) clean.y = clamp(patch.y, -50, 150);
  if (patch.w !== undefined) clean.w = clamp(patch.w, 3, 100);
  if (patch.rotation !== undefined) clean.rotation = clamp(patch.rotation, -180, 180);
  if (patch.z !== undefined) clean.z = Math.round(patch.z);
  if (patch.body !== undefined) clean.body = patch.body.slice(0, 300);
  if (patch.color !== undefined) clean.color = patch.color.slice(0, 20);

  const supabase = await createClient();
  const { error } = await supabase.from("scrapbook_pieces").update(clean).eq("id", id);
  if (error) return { error: "That change didn't save. Try again." };
  await touch(pageId);
  return {};
}

export async function deletePiece(pageId: string, id: string): Promise<Result> {
  if (!(await getUs())) return { error: "Sign in again." };
  const supabase = await createClient();
  const { data } = await supabase.from("scrapbook_pieces").delete().eq("id", id).select("path").maybeSingle();
  if (data?.path) await supabase.storage.from("media").remove([data.path]);
  await touch(pageId);
  return {};
}

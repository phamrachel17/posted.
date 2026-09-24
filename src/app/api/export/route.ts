import { strToU8, zipSync, type Zippable } from "fflate";
import { createClient } from "@/lib/supabase/server";

// Everything you two made, as JSON plus the original photos and voice memos.
export async function GET() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims) return new Response("Sign in first.", { status: 401 });

  const [members, space, notebooks, posts, replies, reactions, media, keeps] = await Promise.all([
    supabase.from("members").select("id, display_name, ink, city, timezone, created_at"),
    supabase.from("spaces").select("name, next_visit_on, next_visit_place, created_at").maybeSingle(),
    supabase.from("notebooks").select("*"),
    supabase.from("posts").select("id, author_id, notebook_id, kind, body, meta, postmark, created_at, edited_at").is("deleted_at", null),
    supabase.from("replies").select("id, post_id, author_id, body, created_at, edited_at").is("deleted_at", null),
    supabase.from("reactions").select("member_id, post_id, reply_id, emoji, created_at"),
    supabase.from("media").select("id, post_id, reply_id, type, path, mime, width, height, duration_ms, peaks"),
    supabase.from("keeps").select("post_id, note, created_at"),
  ]);

  const files: Zippable = {};
  const mediaRows = (media.data ?? []) as { id: string; path: string }[];
  const withFiles = [];
  for (const m of mediaRows) {
    const name = `media/${m.path.split("/").pop()}`;
    const { data } = await supabase.storage.from("media").download(m.path);
    if (data) files[name] = [new Uint8Array(await data.arrayBuffer()), { level: 0 }];
    withFiles.push({ ...m, file: data ? name : null });
  }

  const json = {
    exported_at: new Date().toISOString(),
    space: space.data,
    members: members.data,
    notebooks: notebooks.data,
    posts: posts.data,
    replies: replies.data,
    reactions: reactions.data,
    media: withFiles,
    your_kept_posts: keeps.data,
  };
  files["posted.json"] = strToU8(JSON.stringify(json, null, 2));

  const zip = zipSync(files);
  const date = new Date().toISOString().slice(0, 10);
  return new Response(new Uint8Array(zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="posted-${date}.zip"`,
      "Cache-Control": "no-store",
    },
  });
}

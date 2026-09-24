import "server-only";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type {
  Audio,
  LessonMeta,
  Member,
  Notebook,
  NotebookRef,
  Photo,
  Post,
  Reaction,
  Reply,
  Space,
  Us,
} from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** The signed-in user's id, or null. */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return (data?.claims?.sub as string | undefined) ?? null;
});

/** Me, my partner (once they've joined), and our space. Null if I haven't set up yet. */
export const getUs = cache(async (): Promise<Us | null> => {
  const userId = await getUserId();
  if (!userId) return null;

  const supabase = await createClient();
  const { data: members, error } = await supabase
    .from("members")
    .select("id, space_id, user_id, display_name, ink, city, timezone, last_seen_at, daily_letter_hour");
  if (error) throw error;

  const me = (members as Member[]).find((m) => m.user_id === userId);
  if (!me) return null;
  const partner = (members as Member[]).find((m) => m.user_id !== userId) ?? null;

  const { data: space, error: spaceError } = await supabase
    .from("spaces")
    .select("id, name, next_visit_on, next_visit_place")
    .single();
  if (spaceError) throw spaceError;

  return { me, partner, space: space as Space };
});

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

type MediaRow = {
  id: string;
  type: "photo" | "audio";
  path: string;
  mime: string;
  width: number | null;
  height: number | null;
  duration_ms: number | null;
  peaks: number[] | null;
  position: number;
};

const MEDIA_COLUMNS = "id, type, path, mime, width, height, duration_ms, peaks, position";
const SIGNED_URL_SECONDS = 60 * 60 * 6;

async function signPaths(supabase: Supabase, paths: string[]) {
  const urls = new Map<string, string>();
  if (!paths.length) return urls;
  const { data } = await supabase.storage.from("media").createSignedUrls(paths, SIGNED_URL_SECONDS);
  data?.forEach((s) => s.path && s.signedUrl && urls.set(s.path, s.signedUrl));
  return urls;
}

function toPhotos(media: MediaRow[], urls: Map<string, string>): Photo[] {
  return media
    .filter((m) => m.type === "photo")
    .sort((a, b) => a.position - b.position)
    .map((m) => ({ id: m.id, url: urls.get(m.path) ?? null, width: m.width, height: m.height }));
}

function toAudio(media: MediaRow[], urls: Map<string, string>): Audio | null {
  const m = media.find((x) => x.type === "audio");
  if (!m) return null;
  return { id: m.id, url: urls.get(m.path) ?? null, mime: m.mime, duration_ms: m.duration_ms ?? 0, peaks: m.peaks ?? [] };
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

const POST_COLUMNS = `
  id, author_id, kind, body, meta, postmark, created_at, edited_at,
  notebook:notebooks!posts_notebook_id_space_id_fkey(id, slug, name, doodle, kind),
  media!media_post_id_space_id_fkey(${MEDIA_COLUMNS}),
  reactions!reactions_post_id_space_id_fkey(member_id, emoji),
  replies!replies_post_id_space_id_fkey(author_id, body, created_at, deleted_at, media!media_reply_id_space_id_fkey(type)),
  keeps!keeps_post_id_fkey(member_id)
`;

type PostRow = Omit<Post, "photos" | "audio" | "latestReply" | "kept" | "notebook"> & {
  notebook: NotebookRef | null;
  media: MediaRow[];
  reactions: Reaction[];
  replies: { author_id: string; body: string | null; created_at: string; deleted_at: string | null; media: { type: string }[] }[];
  keeps: { member_id: string }[];
};

async function hydratePosts(supabase: Supabase, rows: PostRow[]): Promise<Post[]> {
  const urls = await signPaths(supabase, rows.flatMap((r) => r.media.map((m) => m.path)));
  return rows.map(({ media, replies, keeps, ...post }) => {
    const live = replies.filter((r) => !r.deleted_at).sort((a, b) => b.created_at.localeCompare(a.created_at));
    const last = live[0];
    return {
      ...post,
      photos: toPhotos(media, urls),
      audio: toAudio(media, urls),
      latestReply: last ? { author_id: last.author_id, body: last.body, hasAudio: last.media.some((m) => m.type === "audio") } : null,
      // RLS only returns my own keeps, so any row means I kept it.
      kept: keeps.length > 0,
    };
  });
}

export const FEED_PAGE = 50;

/** Newest posts first. Optionally one notebook, optionally older than a timestamp. */
export async function getFeed(opts: { notebookId?: string; before?: string; kinds?: Post["kind"][] } = {}): Promise<Post[]> {
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(POST_COLUMNS)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(FEED_PAGE);
  if (opts.notebookId) query = query.eq("notebook_id", opts.notebookId);
  if (opts.before) query = query.lt("created_at", opts.before);
  if (opts.kinds) query = query.in("kind", opts.kinds);

  const { data, error } = await query;
  if (error) throw error;
  return hydratePosts(supabase, data as unknown as PostRow[]);
}

/** One post with all its replies, oldest reply first. */
export async function getPost(id: string): Promise<{ post: Post; replies: Reply[] } | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.from("posts").select(POST_COLUMNS).eq("id", id).is("deleted_at", null).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const [post] = await hydratePosts(supabase, [data as unknown as PostRow]);

  const { data: replyRows, error: replyError } = await supabase
    .from("replies")
    .select(
      `id, author_id, body, created_at, edited_at,
       media!media_reply_id_space_id_fkey(${MEDIA_COLUMNS}),
       reactions!reactions_reply_id_space_id_fkey(member_id, emoji)`,
    )
    .eq("post_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });
  if (replyError) throw replyError;

  type ReplyRow = Omit<Reply, "audio"> & { media: MediaRow[] };
  const rows = replyRows as unknown as ReplyRow[];
  const urls = await signPaths(supabase, rows.flatMap((r) => r.media.map((m) => m.path)));
  const replies = rows.map(({ media, ...r }) => ({ ...r, audio: toAudio(media, urls) }));
  return { post, replies };
}

// ---------------------------------------------------------------------------
// Notebooks
// ---------------------------------------------------------------------------

const NOTEBOOK_COLUMNS = "id, slug, name, doodle, kind, cover, description, archived_at, created_at";

export const getNotebooks = cache(async (): Promise<Notebook[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("notebooks")
    .select(NOTEBOOK_COLUMNS)
    .is("archived_at", null)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Notebook[];
});

export async function getNotebook(slug: string): Promise<Notebook | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notebooks").select(NOTEBOOK_COLUMNS).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data as Notebook | null;
}

/** Who wrote in each notebook last, and when. */
export async function getNotebookActivity(): Promise<Map<string, { author_id: string; created_at: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("notebook_id, author_id, created_at")
    .not("notebook_id", "is", null)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(500);
  if (error) throw error;
  const latest = new Map<string, { author_id: string; created_at: string }>();
  for (const row of data as { notebook_id: string; author_id: string; created_at: string }[]) {
    if (!latest.has(row.notebook_id)) latest.set(row.notebook_id, { author_id: row.author_id, created_at: row.created_at });
  }
  return latest;
}

export type LessonSummary = { id: string; author_id: string; meta: LessonMeta; created_at: string };

/** Lessons in a notebook, newest first. */
export async function getLessons(notebookId: string): Promise<LessonSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, meta, created_at")
    .eq("notebook_id", notebookId)
    .eq("kind", "lesson")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as LessonSummary[]).sort((a, b) => (b.meta.n ?? 0) - (a.meta.n ?? 0));
}

/** The newest lesson in any lesson notebook, for the Today rail. */
export async function getLatestLesson(): Promise<(LessonSummary & { notebook: NotebookRef }) | null> {
  const notebooks = (await getNotebooks()).filter((n) => n.kind === "lessons");
  if (!notebooks.length) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, meta, created_at, notebook:notebooks!posts_notebook_id_space_id_fkey(id, slug, name, doodle, kind)")
    .in("notebook_id", notebooks.map((n) => n.id))
    .eq("kind", "lesson")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data as unknown as (LessonSummary & { notebook: NotebookRef }) | null;
}

// ---------------------------------------------------------------------------
// Kept
// ---------------------------------------------------------------------------

export type KeptItem = { note: string | null; kept_at: string; post: Post };

export async function getKept(): Promise<KeptItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("keeps")
    .select(`note, created_at, post:posts!keeps_post_id_fkey(${POST_COLUMNS}, deleted_at)`)
    .order("created_at", { ascending: false });
  if (error) throw error;

  type Row = { note: string | null; created_at: string; post: (PostRow & { deleted_at: string | null }) | null };
  const rows = (data as unknown as Row[]).filter((r) => r.post && !r.post.deleted_at);
  const posts = await hydratePosts(supabase, rows.map((r) => r.post!));
  return rows.map((r, i) => ({ note: r.note, kept_at: r.created_at, post: posts[i] }));
}

/**
 * Notebooks with something new from the other person since you last opened them.
 * Returns an empty set (no dots) if the notebook_reads migration hasn't been run.
 */
export const getNotebookNews = cache(async (): Promise<Set<string>> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("notebooks_with_news");
  if (error) {
    if (error.code !== "PGRST202") console.error("notebooks_with_news failed:", error.message);
    return new Set();
  }
  return new Set((data as string[] | null) ?? []);
});

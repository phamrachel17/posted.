"use client";

import { useEffect, useState } from "react";
import type { People } from "@/lib/people";
import type { Post } from "@/lib/types";
import { PostCard } from "./PostCard";

/** What the composer announces when you press Post, before the server has it. */
export type PendingDetail = { post: Post; notebookId: string | null };

export const PENDING_EVENT = "posted:pending";
export const PENDING_DONE_EVENT = "posted:pending-done";

/**
 * Your new post, shown the moment you send it: it lands on the wall right away
 * while the server saves it. When the page comes back with the real post, this
 * copy steps aside, so the wait never shows.
 */
export function PendingPosts({ people, viewerTz, notebookId = null }: { people: People; viewerTz: string; notebookId?: string | null }) {
  const [pending, setPending] = useState<Post[]>([]);

  useEffect(() => {
    const add = (e: Event) => {
      const d = (e as CustomEvent<PendingDetail>).detail;
      if ((d.notebookId ?? null) === notebookId) setPending((list) => [d.post, ...list]);
    };
    const done = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      setPending((list) => list.filter((p) => p.id !== id));
    };
    window.addEventListener(PENDING_EVENT, add);
    window.addEventListener(PENDING_DONE_EVENT, done);
    return () => {
      window.removeEventListener(PENDING_EVENT, add);
      window.removeEventListener(PENDING_DONE_EVENT, done);
    };
  }, [notebookId]);

  if (!pending.length) return null;
  return (
    <>
      {pending.map((post) => (
        <PostCard key={post.id} post={post} people={people} viewerTz={viewerTz} now={new Date(post.created_at)} hideNotebook readOnly landing />
      ))}
    </>
  );
}

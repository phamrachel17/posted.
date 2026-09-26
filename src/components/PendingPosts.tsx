"use client";

import { useEffect, useState } from "react";
import type { People } from "@/lib/people";
import type { Post } from "@/lib/types";
import { PostCard } from "./PostCard";

/** What the composer announces when you press Post, before the server has it. */
export type PendingDetail = { post: Post; notebookId: string | null };

export const PENDING_EVENT = "posted:pending";
export const PENDING_DONE_EVENT = "posted:pending-done";

type Pending = { post: Post; realId?: string };

/**
 * Your new post, shown the moment you send it: it lands on the wall right away
 * while the server saves it. It stays until the real post is on the page (its id
 * shows up in `knownIds`), then steps aside in the same moment, so there's no gap.
 */
export function PendingPosts({
  people,
  viewerTz,
  notebookId = null,
  knownIds = [],
}: {
  people: People;
  viewerTz: string;
  notebookId?: string | null;
  /** Ids of the posts the page is showing. */
  knownIds?: string[];
}) {
  const [pending, setPending] = useState<Pending[]>([]);

  useEffect(() => {
    const add = (e: Event) => {
      const d = (e as CustomEvent<PendingDetail>).detail;
      if ((d.notebookId ?? null) === notebookId) setPending((list) => [{ post: d.post }, ...list]);
    };
    const done = (e: Event) => {
      const { id, realId } = (e as CustomEvent<{ id: string; realId: string | null }>).detail;
      if (!realId) return setPending((list) => list.filter((p) => p.post.id !== id));
      setPending((list) => list.map((p) => (p.post.id === id ? { ...p, realId } : p)));
      // If the page never picks it up (a slow refresh), don't leave a copy behind forever.
      window.setTimeout(() => setPending((list) => list.filter((p) => p.post.id !== id)), 15_000);
    };
    window.addEventListener(PENDING_EVENT, add);
    window.addEventListener(PENDING_DONE_EVENT, done);
    return () => {
      window.removeEventListener(PENDING_EVENT, add);
      window.removeEventListener(PENDING_DONE_EVENT, done);
    };
  }, [notebookId]);

  // Real posts that have arrived: they stay hidden until their images are loaded,
  // then take over from the copy in one go, so nothing flickers or reloads.
  const [ready, setReady] = useState<string[]>([]);
  const arrived = pending.filter((p) => p.realId && knownIds.includes(p.realId)).map((p) => p.realId!);
  const arrivedKey = arrived.join(",");
  useEffect(() => {
    if (!arrivedKey) return;
    let live = true;
    for (const id of arrivedKey.split(",")) {
      const card = document.querySelector<HTMLElement>(`article[data-post-id="${id}"]`);
      const imgs = card ? Array.from(card.querySelectorAll("img")) : [];
      const decoded = imgs.map((img) => img.decode().catch(() => {}));
      // Never wait long: at worst, swap after a moment anyway.
      Promise.race([Promise.all(decoded), new Promise((r) => setTimeout(r, 1500))]).then(() => {
        if (live) setReady((r) => (r.includes(id) ? r : [...r, id]));
      });
    }
    return () => {
      live = false;
    };
  }, [arrivedKey]);

  const shown = pending.filter((p) => !p.realId || !ready.includes(p.realId));
  const waiting = arrived.filter((id) => !ready.includes(id));
  if (!shown.length) return null;
  return (
    <>
      {waiting.length > 0 && (
        <style>{waiting.map((id) => `article[data-post-id="${id}"]{position:absolute;left:0;right:0;visibility:hidden;pointer-events:none}`).join("")}</style>
      )}
      {shown.map(({ post }) => (
        <PostCard key={post.id} post={post} people={people} viewerTz={viewerTz} now={new Date(post.created_at)} hideNotebook landing sending />
      ))}
    </>
  );
}

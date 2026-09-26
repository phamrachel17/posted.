"use client";

import { useEffect, useState, useTransition } from "react";
import { updatePostBody, updateReplyBody } from "@/app/actions/posts";
import { splitSpotify } from "@/lib/spotify-links";
import { Doodle } from "./Doodle";
import { EDIT_EVENT } from "./PostMenu";
import { SpotifyEmbeds } from "./SpotifyEmbeds";

type Props = {
  postId: string;
  body: string | null;
  kind?: "post" | "reply";
  className?: string;
  /** Show Spotify links as players. Off for one-line previews. */
  embeds?: boolean;
  /** The post's photos, which can be taken out while editing. */
  photos?: { id: string; url: string | null }[];
};

/** Post or note text, which its author can edit in place from the "..." menu. */
export function PostBody({ postId, body, kind = "post", className = "post-body", embeds = true, photos = [] }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onEdit = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== postId) return;
      setDraft(body ?? "");
      setRemoving([]);
      setEditing(true);
    };
    window.addEventListener(EDIT_EVENT, onEdit);
    return () => window.removeEventListener(EDIT_EVENT, onEdit);
  }, [postId, body]);

  if (!editing) {
    if (!body) return null;
    const { text, links } = splitSpotify(body);
    if (!embeds) return <p className={className}>{text || "A Spotify link"}</p>;
    return (
      <>
        {text && <p className={className}>{text}</p>}
        <SpotifyEmbeds links={links} />
      </>
    );
  }

  return (
    <form
      className="post-edit"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const result = kind === "reply" ? await updateReplyBody(postId, draft) : await updatePostBody(postId, draft, removing);
          if (result.error) setError(result.error);
          else setEditing(false);
        });
      }}
    >
      <textarea
        className="post-body"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        autoFocus
        maxLength={10_000}
        aria-label="Edit post"
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
      />
      {photos.length > 0 && (
        <div className="edit-photos">
          {photos.map((p) => {
            const out = removing.includes(p.id);
            return (
              <span key={p.id} className={out ? "edit-photo is-out" : "edit-photo"}>
                {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase links */}
                {p.url && <img src={p.url} alt="" />}
                <button
                  type="button"
                  aria-label={out ? "Keep this photo" : "Take this photo out"}
                  title={out ? "Keep this photo" : "Take this photo out"}
                  onClick={() => setRemoving((r) => (out ? r.filter((x) => x !== p.id) : [...r, p.id]))}
                >
                  {out ? "↺" : <Doodle name="close" size={11} />}
                </button>
              </span>
            );
          })}
        </div>
      )}
      {error && <p className="error-note"><b>{error}</b></p>}
      <div className="menu-confirm-actions">
        <button type="button" className="btn btn-quiet" onClick={() => setEditing(false)}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

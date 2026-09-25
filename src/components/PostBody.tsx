"use client";

import { useEffect, useState, useTransition } from "react";
import { updatePostBody, updateReplyBody } from "@/app/actions/posts";
import { splitSpotify } from "@/lib/spotify-links";
import { EDIT_EVENT } from "./PostMenu";
import { SpotifyEmbeds } from "./SpotifyEmbeds";

type Props = {
  postId: string;
  body: string | null;
  kind?: "post" | "reply";
  className?: string;
  /** Show Spotify links as players. Off for one-line previews. */
  embeds?: boolean;
};

/** Post or note text, which its author can edit in place from the "..." menu. */
export function PostBody({ postId, body, kind = "post", className = "post-body", embeds = true }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onEdit = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== postId) return;
      setDraft(body ?? "");
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
          const result = kind === "reply" ? await updateReplyBody(postId, draft) : await updatePostBody(postId, draft);
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
      {error && <p className="error-note"><b>{error}</b></p>}
      <div className="menu-confirm-actions">
        <button type="button" className="btn btn-quiet" onClick={() => setEditing(false)}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Saving…" : "Save"}</button>
      </div>
    </form>
  );
}

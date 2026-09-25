"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { deletePost, deleteReply, setKept } from "@/app/actions/posts";
import { Doodle } from "./Doodle";

export const EDIT_EVENT = "posted:edit";

type Props = {
  postId: string;
  isMine: boolean;
  kept: boolean;
  canEdit: boolean;
  leaveOnDelete?: boolean;
  /** A reply (note) instead of a post: no Keep, and Delete removes the note. */
  kind?: "post" | "reply";
};

/** The "..." on a card or note: Keep for everyone, Edit and Delete on your own. */
export function PostMenu({ postId, isMine, kept, canEdit, leaveOnDelete, kind = "post" }: Props) {
  const isReply = kind === "reply";
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [, startTransition] = useTransition();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  return (
    <div className="post-menu" ref={ref}>
      <button
        type="button"
        className="post-menu-btn"
        aria-label="More"
        aria-expanded={open}
        onClick={() => {
          setOpen((o) => !o);
          setConfirming(false);
        }}
      >
        <Doodle name="more" size={20} />
      </button>
      {open && (
        <div className="post-menu-panel" role="menu">
          {confirming ? (
            <form action={isReply ? deleteReply : deletePost} className="menu-confirm">
              <input type="hidden" name="id" value={postId} />
              {leaveOnDelete && <input type="hidden" name="leave" value="1" />}
              <span>{isReply ? "Delete this note?" : "Delete this post?"} This can&rsquo;t be undone.</span>
              <div className="menu-confirm-actions">
                <button type="button" className="btn btn-quiet" onClick={() => setConfirming(false)}>Keep it</button>
                <button type="submit" className="btn btn-danger">Delete</button>
              </div>
            </form>
          ) : (
            <>
              {!isReply && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  startTransition(async () => {
                    await setKept(postId, !kept);
                  });
                }}
              >
                <Doodle name="kept" size={16} />
                {kept ? "Unkeep" : "Keep"}
                {!kept && <span className="hint">Only you will see it</span>}
              </button>
              )}
              {isMine && canEdit && (
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    window.dispatchEvent(new CustomEvent(EDIT_EVENT, { detail: postId }));
                  }}
                >
                  <Doodle name="pen" size={16} />
                  Edit
                </button>
              )}
              {isMine && (
                <button type="button" role="menuitem" className="danger" onClick={() => setConfirming(true)}>
                  <Doodle name="trash" size={16} />
                  Delete
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

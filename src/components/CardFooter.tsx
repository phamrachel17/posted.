"use client";

import { useState } from "react";
import { WriteBack } from "./WriteBack";

type Props = {
  postId: string;
  spaceId: string;
  partnerName?: string;
  /** Reactions, on the left of the footer. */
  start: React.ReactNode;
  /** Kept mark and "…" menu, on the right. */
  end: React.ReactNode;
};

/** A card's footer with "Write back", which opens a reply box inside the card. */
export function CardFooter({ postId, spaceId, partnerName, start, end }: Props) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <footer className="card-foot">
        {start}
        <button
          type="button"
          className="write-back-link"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Write back"}
        </button>
        {end}
      </footer>
      {open && (
        <div className="inline-write-back">
          <WriteBack postId={postId} spaceId={spaceId} partnerName={partnerName} autoFocus onSent={() => setOpen(false)} />
        </div>
      )}
    </>
  );
}

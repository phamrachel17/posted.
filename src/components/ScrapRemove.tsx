"use client";

import { useTransition } from "react";
import { setInScrapbook } from "@/app/actions/posts";
import { Doodle } from "./Doodle";

/** Takes a post out of the scrapbook. The post itself stays where it was. */
export function ScrapRemove({ postId }: { postId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      className="scrap-remove"
      aria-label="Remove from scrapbook"
      title="Remove from scrapbook (the post stays)"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await setInScrapbook(postId, false);
        })
      }
    >
      <Doodle name="close" size={12} />
    </button>
  );
}

"use client";

import { useEffect } from "react";
import { markNotebookRead } from "@/app/actions/notebooks";

/** Clears a notebook's "new" dot once you've opened it. */
export function MarkNotebookRead({ notebookId, hasNews }: { notebookId: string; hasNews: boolean }) {
  useEffect(() => {
    // Also runs when you leave, so posts that arrived while you were reading count as seen.
    if (hasNews) markNotebookRead(notebookId);
    return () => {
      markNotebookRead(notebookId);
    };
  }, [notebookId, hasNews]);
  return null;
}

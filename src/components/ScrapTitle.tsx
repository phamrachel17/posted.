"use client";

import { useState, useTransition } from "react";
import { setScrapbookTitle } from "@/app/actions/posts";

/** A handwritten-style title under a scrapbook item. Either of you can set it. */
export function ScrapTitle({ postId, title }: { postId: string; title: string | null }) {
  const [saved, setSaved] = useState(title ?? "");
  const [value, setValue] = useState(title ?? "");
  const [editing, setEditing] = useState(false);
  const [, startTransition] = useTransition();

  if (!editing) {
    return (
      <button type="button" className={saved ? "scrap-title" : "scrap-title empty"} onClick={() => setEditing(true)}>
        {saved || "Add a title"}
      </button>
    );
  }

  const save = () => {
    setEditing(false);
    if (value.trim() === saved) return;
    setSaved(value.trim());
    startTransition(async () => {
      await setScrapbookTitle(postId, value);
    });
  };

  return (
    <input
      className="scrap-title-input"
      value={value}
      maxLength={80}
      autoFocus
      aria-label="Title"
      placeholder="A title for this"
      onChange={(e) => setValue(e.target.value)}
      onBlur={save}
      onKeyDown={(e) => {
        if (e.key === "Enter") save();
        if (e.key === "Escape") {
          setValue(saved);
          setEditing(false);
        }
      }}
    />
  );
}

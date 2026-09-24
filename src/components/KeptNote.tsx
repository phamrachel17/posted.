"use client";

import { useState, useTransition } from "react";
import { setKeptNote } from "@/app/actions/posts";

/** A private line about why you kept something. */
export function KeptNote({ postId, note }: { postId: string; note: string | null }) {
  const [value, setValue] = useState(note ?? "");
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(note ?? "");
  const [, startTransition] = useTransition();

  if (!editing) {
    return (
      <button type="button" className={saved ? "kept-note" : "kept-note empty"} onClick={() => setEditing(true)}>
        {saved || "Add a note to yourself"}
      </button>
    );
  }

  const save = () => {
    setEditing(false);
    if (value === saved) return;
    setSaved(value.trim());
    startTransition(async () => {
      await setKeptNote(postId, value);
    });
  };

  return (
    <input
      className="kept-note-input"
      value={value}
      maxLength={140}
      autoFocus
      aria-label="Why you kept this"
      placeholder="Why you kept this"
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

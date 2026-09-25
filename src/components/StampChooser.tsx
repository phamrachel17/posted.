"use client";

import { useRef, useState, type CSSProperties } from "react";
import { addStamp, removeStamp } from "@/app/actions/stamps";
import { PhotoError } from "@/lib/images";
import { inkStyle } from "@/lib/inks";
import type { People } from "@/lib/people";
import { STAMP_DESIGNS, type BookStamp } from "@/lib/stamps";
import { removeUpload, uploadStamp } from "@/lib/upload";
import { Doodle } from "./Doodle";
import { Stamp } from "./Stamp";

type Props = {
  value: string;
  onChange: (value: string) => void;
  book: BookStamp[];
  onBookChange: (book: BookStamp[]) => void;
  people: People;
  /** Photos already on the post being written, offered as a quick stamp. */
  postFiles?: { id: string; file: File; preview: string }[];
  /** Lets you take your own photos out of the book (in settings). */
  canRemove?: boolean;
  preview?: boolean;
};

/** The designed stamps and the shared stamp book, with a way to add a photo. */
export function StampChooser({ value, onChange, book, onBookChange, people, postFiles = [], canRemove, preview }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function addFrom(file: File) {
    setError(null);
    setBusy(true);
    try {
      const path = await uploadStamp(people.spaceId, file);
      const result = await addStamp(path);
      if (result.error || !result.stamp) {
        void removeUpload(path);
        setError(result.error ?? "That stamp didn't save. Try again.");
        return;
      }
      onBookChange([result.stamp, ...book]);
      onChange(`photo:${result.stamp.path}`);
    } catch (err) {
      setError(err instanceof PhotoError ? err.message : "The stamp couldn't be uploaded. Try again.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function remove(s: BookStamp) {
    const result = await removeStamp(s.id);
    if (result.error) return setError(result.error);
    onBookChange(book.filter((b) => b.id !== s.id));
    if (value === `photo:${s.path}`) onChange(`design:${STAMP_DESIGNS[0].id}`);
  }

  return (
    <div className="stamp-chooser">
      <div className="stamp-group">
        <span className="label">Designs</span>
        <div className="stamp-grid" role="radiogroup" aria-label="Designed stamps">
          {STAMP_DESIGNS.map((d) => (
            <button
              key={d.id}
              type="button"
              role="radio"
              aria-checked={value === `design:${d.id}`}
              aria-label={d.label}
              title={d.label}
              onClick={() => onChange(`design:${d.id}`)}
            >
              <Stamp stamp={{ kind: "design", design: d }} size="tray" />
            </button>
          ))}
        </div>
      </div>

      <div className="stamp-group">
        <span className="label">Our stamp book</span>
        <div className="stamp-grid" role="radiogroup" aria-label="Photo stamps">
          {book.map((s) => {
            const who = people.byId[s.addedBy];
            const theirs = s.addedBy !== people.meId;
            return (
              <div key={s.id} className="stamp-cell">
                <button
                  type="button"
                  role="radio"
                  aria-checked={value === `photo:${s.path}`}
                  aria-label={theirs && who ? `Photo stamp from ${who.name}` : "Your photo stamp"}
                  onClick={() => onChange(`photo:${s.path}`)}
                >
                  <Stamp stamp={{ kind: "photo", url: s.url }} size="tray" />
                </button>
                {theirs && who && (
                  <span className="stamp-from" style={inkStyle(who.ink) as CSSProperties}>from {who.name}</span>
                )}
                {!theirs && canRemove && (
                  <button type="button" className="stamp-remove" aria-label="Take this stamp out of the book" onClick={() => remove(s)}>
                    <Doodle name="close" size={10} />
                  </button>
                )}
              </div>
            );
          })}
          {postFiles.map((f) => (
            <button
              key={f.id}
              type="button"
              className="stamp-add"
              disabled={busy || preview}
              onClick={() => addFrom(f.file)}
              title="Make a stamp from this photo"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a file being posted */}
              <img src={f.preview} alt="" />
              <span>Use this photo</span>
            </button>
          ))}
          <button type="button" className="stamp-add" disabled={busy || preview} onClick={() => fileRef.current?.click()}>
            <Doodle name="camera" size={18} />
            <span>{busy ? "Adding…" : "Add a photo"}</span>
          </button>
          <input ref={fileRef} type="file" hidden accept="image/*,.heic,.heif" onChange={(e) => e.target.files?.[0] && addFrom(e.target.files[0])} />
        </div>
        {book.length === 0 && <span className="hint">Photos either of you turn into stamps are kept here for both of you.</span>}
      </div>
      {error && <p className="error-note"><b>{error}</b></p>}
    </div>
  );
}

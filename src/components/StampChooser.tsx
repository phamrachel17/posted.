"use client";

import { useRef, useState, type CSSProperties } from "react";
import { addStamp, removeStamp } from "@/app/actions/stamps";
import { PhotoError } from "@/lib/images";
import { inkStyle } from "@/lib/inks";
import type { People } from "@/lib/people";
import { STAMP_DESIGNS, type BookStamp, type CityStamp } from "@/lib/stamps";
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
  /** Your city's stamp, offered first. */
  city?: CityStamp | null;
};

type Page = "city" | "designs" | "photos";

/** The stamp book: your city, the designed stamps, and your shared photo stamps, a page each. */
export function StampChooser({ value, onChange, book, onBookChange, people, postFiles = [], canRemove, preview, city }: Props) {
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

  // The book opens to the page that holds the stamp you're using.
  const onPage: Page = value.startsWith("photo:") ? "photos" : value.startsWith("design:") ? "designs" : city ? "city" : "designs";
  const [page, setPage] = useState<Page>(onPage);
  const pages: { id: Page; label: string }[] = [
    ...(city ? [{ id: "city" as const, label: "Your city" }] : []),
    { id: "designs", label: "Designs" },
    { id: "photos", label: `Our photos${book.length ? ` · ${book.length}` : ""}` },
  ];

  return (
    <div className="stamp-album">
      <div className="album-tabs" role="tablist" aria-label="Stamp book">
        {pages.map((p) => (
          <button key={p.id} type="button" role="tab" aria-selected={page === p.id} onClick={() => setPage(p.id)}>
            {p.label}
          </button>
        ))}
      </div>

      <div className="album-page" role="tabpanel">
        {page === "city" && city && (
          <div className="album-strip" role="radiogroup" aria-label="Your city">
            <button type="button" role="radio" aria-checked={value === "city" || value === `city:${city.city}`} aria-label={city.city} title={city.city} onClick={() => onChange("city")}>
              <Stamp stamp={{ kind: "city", ...city }} size="album" />
            </button>
            <span className="hint album-note">Follows your city in Settings.</span>
          </div>
        )}

        {page === "designs" && (
          <div className="album-strip" role="radiogroup" aria-label="Designed stamps">
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
                <Stamp stamp={{ kind: "design", design: d }} size="album" />
              </button>
            ))}
          </div>
        )}

        {page === "photos" && (
          <>
            <div className="album-strip" role="radiogroup" aria-label="Photo stamps">
              {book.map((s) => {
                const who = people.byId[s.addedBy];
                const theirs = s.addedBy !== people.meId;
                return (
                  <span key={s.id} className="album-slot">
                    <button
                      type="button"
                      role="radio"
                      aria-checked={value === `photo:${s.path}`}
                      aria-label={theirs && who ? `Photo stamp from ${who.name}` : "Your photo stamp"}
                      title={theirs && who ? `From ${who.name}` : "Yours"}
                      onClick={() => onChange(`photo:${s.path}`)}
                    >
                      <Stamp stamp={{ kind: "photo", url: s.url }} size="album" />
                    </button>
                    {/* A stamp the other person made carries a dot of their ink. */}
                    {theirs && who && <i className="album-from" style={inkStyle(who.ink) as CSSProperties} aria-hidden />}
                    {!theirs && canRemove && (
                      <button type="button" className="stamp-remove" aria-label="Take this stamp out of the book" onClick={() => remove(s)}>
                        <Doodle name="close" size={9} />
                      </button>
                    )}
                  </span>
                );
              })}
              {postFiles.map((f) => (
                <button key={f.id} type="button" className="album-add" disabled={busy || preview} onClick={() => addFrom(f.file)} title="Make a stamp from this photo">
                  {/* eslint-disable-next-line @next/next/no-img-element -- a local preview of a file being posted */}
                  <img src={f.preview} alt="" />
                </button>
              ))}
              <button type="button" className="album-add" disabled={busy || preview} onClick={() => fileRef.current?.click()} title="Add a photo stamp" aria-label="Add a photo stamp">
                {busy ? "…" : <Doodle name="plus" size={16} />}
              </button>
              <input ref={fileRef} type="file" hidden accept="image/*,.heic,.heif" onChange={(e) => e.target.files?.[0] && addFrom(e.target.files[0])} />
            </div>
            <span className="hint album-note">
              {book.some((s) => s.addedBy !== people.meId) ? "A colored dot means the other person made it. " : ""}
              {postFiles.length ? "Tap a photo from this post to make it a stamp." : "Photos either of you add are kept here for both of you."}
            </span>
          </>
        )}
      </div>
      {error && <p className="error-note"><b>{error}</b></p>}
    </div>
  );
}

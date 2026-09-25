"use client";

import { useState, useTransition } from "react";
import { setDefaultStamp } from "@/app/actions/stamps";
import type { People } from "@/lib/people";
import { DEFAULT_STAMP, stampView, type BookStamp } from "@/lib/stamps";
import { Stamp } from "./Stamp";
import { StampChooser } from "./StampChooser";

type Props = { defaultStamp: string | null; book: BookStamp[]; people: People };

/** Your usual stamp for Today posts, and the shared stamp book. */
export function StampSettings({ defaultStamp, book: initialBook, people }: Props) {
  const [value, setValue] = useState(defaultStamp || DEFAULT_STAMP);
  const [book, setBook] = useState(initialBook);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();
  const current = stampView(value, Object.fromEntries(book.map((b) => [b.path, b.url]))) ?? stampView(DEFAULT_STAMP, {});

  function choose(next: string) {
    const before = value;
    setValue(next);
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await setDefaultStamp(next);
      if (result.error) {
        setValue(before);
        setError(result.error);
      } else setSaved(true);
    });
  }

  return (
    <div className="stamp-settings">
      <div className="stamp-settings-now">
        {current && <span><Stamp stamp={current} size="big" /></span>}
        <p className="hint">
          Every post on Today goes out with this stamp. You can pick a different one for a single post from the
          composer. {pending ? "Saving…" : saved ? "Saved." : ""}
        </p>
      </div>
      <StampChooser value={value} onChange={choose} book={book} onBookChange={setBook} people={people} canRemove />
      {error && <p className="error-note"><b>{error}</b></p>}
    </div>
  );
}

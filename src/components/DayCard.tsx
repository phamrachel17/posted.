"use client";

import { useEffect, useState, useTransition } from "react";
import { updateDay } from "@/app/actions/posts";
import { dayAnswers, dayFeeling } from "@/lib/day";
import { splitSpotify } from "@/lib/spotify-links";
import { SpotifyEmbeds } from "./SpotifyEmbeds";
import type { DayMeta } from "@/lib/types";
import { DayFields } from "./DayFields";
import { Doodle } from "./Doodle";
import { EDIT_EVENT } from "./PostMenu";

type Props = {
  postId: string;
  meta: DayMeta;
  authorId: string;
  /** The day this My day is for, "YYYY-MM-DD". */
  date: string;
  timeZone: string;
};

/** A My day on a card, which its author can edit in place from the "…" menu. */
export function DayCard({ postId, meta, authorId, date, timeZone }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<DayMeta>>(meta);
  const [draftDate, setDraftDate] = useState(date);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onEdit = (e: Event) => {
      if ((e as CustomEvent<string>).detail !== postId) return;
      setDraft(meta);
      setDraftDate(date);
      setError(null);
      setEditing(true);
    };
    window.addEventListener(EDIT_EVENT, onEdit);
    return () => window.removeEventListener(EDIT_EVENT, onEdit);
  }, [postId, meta, date]);

  if (editing) {
    return (
      <form
        className="day-edit"
        onSubmit={(e) => {
          e.preventDefault();
          startTransition(async () => {
            const r = await updateDay(postId, draft as DayMeta, draftDate);
            if (r.error) return setError(r.error);
            setEditing(false);
          });
        }}
      >
        <DayFields value={draft} onChange={setDraft} date={draftDate} onDate={setDraftDate} timeZone={timeZone} />
        {error && <p className="error-note"><b>{error}</b></p>}
        <div className="menu-confirm-actions">
          <button type="button" className="btn btn-quiet" onClick={() => setEditing(false)}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={pending || !(draft.mood || draft.note?.trim())}>{pending ? "Saving…" : "Save"}</button>
        </div>
      </form>
    );
  }

  const feeling = dayFeeling(meta);
  const answers = dayAnswers(meta);
  const note = meta.note ? splitSpotify(meta.note) : null;
  return (
    <div className="day-card">
      {(feeling || meta.energy) && <div className="day-top">
        {feeling && (
          <div className="weather">
            <Doodle name={feeling.doodle} size={42} />
            <b>{feeling.label}</b>
          </div>
        )}
        {meta.energy && (
          <div className="energy" aria-label={`Energy ${meta.energy} of 5`} data-author={authorId}>
            energy
            {[1, 2, 3, 4, 5].map((n) => <i key={n} className={n <= meta.energy! ? "on" : undefined} />)}
          </div>
        )}
      </div>}
      {answers.length > 0 && (
        <dl className="day-fields">
          {answers.map((a) => (
            <div key={a.key}>
              <dt>{a.label}</dt>
              <dd>{a.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {note?.text && <p className="day-note">{note.text}</p>}
      {note && <SpotifyEmbeds links={note.links} />}
    </div>
  );
}

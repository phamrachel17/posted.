"use client";

import { useState, useTransition } from "react";
import { addBucketItem, deleteBucketItem, editBucketItem, setBucketDone } from "@/app/actions/bucket";
import type { BucketItem } from "@/lib/data";
import { inkStyle } from "@/lib/inks";
import type { People } from "@/lib/people";
import { Doodle } from "./Doodle";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
};

/** The shared bucket list: add things to do together, check them off in your ink. */
export function BucketList({ initial, people }: { initial: BucketItem[]; people: People }) {
  const [items, setItems] = useState(initial);
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const todo = items.filter((i) => !i.done_at);
  const done = items.filter((i) => i.done_at).sort((a, b) => b.done_at!.localeCompare(a.done_at!));

  function run(fn: () => Promise<{ error?: string }>) {
    startTransition(async () => {
      const r = await fn();
      setError(r.error ?? null);
    });
  }

  function toggle(item: BucketItem) {
    const nowDone = !item.done_at;
    setItems((list) =>
      list.map((i) => (i.id === item.id ? { ...i, done_at: nowDone ? new Date().toISOString() : null, done_by: nowDone ? people.meId : null } : i)),
    );
    run(() => setBucketDone(item.id, nowDone));
  }

  function row(item: BucketItem) {
    const doer = item.done_by ? people.byId[item.done_by] : null;
    const adder = people.byId[item.added_by];
    return (
      <li key={item.id} className={item.done_at ? "bucket-item is-done" : "bucket-item"} style={doer ? inkStyle(doer.ink) : undefined}>
        <label className="bucket-check">
          <input type="checkbox" checked={Boolean(item.done_at)} onChange={() => toggle(item)} aria-label={item.done_at ? "Mark as not done" : "Mark as done"} />
          <span className="box" aria-hidden>{item.done_at && <Doodle name="check" size={14} />}</span>
        </label>
        {editing === item.id ? (
          <input
            className="bucket-edit"
            defaultValue={item.body}
            autoFocus
            maxLength={200}
            aria-label="Edit"
            onBlur={(e) => {
              const body = e.target.value.trim();
              setEditing(null);
              if (body && body !== item.body) {
                setItems((list) => list.map((i) => (i.id === item.id ? { ...i, body } : i)));
                run(() => editBucketItem(item.id, body));
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") setEditing(null);
            }}
          />
        ) : (
          <span className="bucket-body" onDoubleClick={() => setEditing(item.id)}>
            {item.body}
            <span className="bucket-meta">
              {item.done_at && doer
                ? `${item.done_by === people.meId ? "You" : doer.name} checked it off · ${shortDate(item.done_at)}`
                : adder
                  ? `Added by ${item.added_by === people.meId ? "you" : adder.name}`
                  : ""}
            </span>
          </span>
        )}
        <span className="bucket-actions">
          <button type="button" className="icon-btn" aria-label="Edit" onClick={() => setEditing(item.id)}>
            <Doodle name="pen" size={15} />
          </button>
          <button
            type="button"
            className="icon-btn danger"
            aria-label="Remove"
            onClick={() => {
              setItems((list) => list.filter((i) => i.id !== item.id));
              run(() => deleteBucketItem(item.id));
            }}
          >
            <Doodle name="trash" size={15} />
          </button>
        </span>
      </li>
    );
  }

  const total = items.length;
  const pct = total ? Math.round((done.length / total) * 100) : 0;

  return (
    <div className="bucket">
      {total > 0 && (
        <div className="bucket-progress" aria-label={`${done.length} of ${total} done`}>
          <div className="bucket-bar"><i style={{ width: `${pct}%` }} /></div>
          <span><b>{done.length}</b> of {total} done</span>
        </div>
      )}

      <form
        className="bucket-add"
        onSubmit={(e) => {
          e.preventDefault();
          const body = draft.trim();
          if (!body) return;
          setDraft("");
          startTransition(async () => {
            const r = await addBucketItem(body);
            if (r.error || !r.id) return setError(r.error ?? "That didn't get added.");
            setError(null);
            setItems((list) => [
              ...list,
              { id: r.id!, body, note: null, added_by: people.meId, done_by: null, done_at: null, created_at: new Date().toISOString() },
            ]);
          });
        }}
      >
        <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={200} placeholder="Something to do together…" aria-label="New bucket list item" />
        <button type="submit" className="btn btn-primary" disabled={!draft.trim()}>Add</button>
      </form>
      {error && <p className="error-note"><b>{error}</b></p>}

      {total === 0 ? (
        <div className="empty">
          <Doodle name="stars" size={56} height={62} />
          <b>Nothing on the list yet</b>
          <p>Places to go, things to try, a sunrise to watch. Either of you can add to it and check things off.</p>
        </div>
      ) : (
        <>
          <section>
            <h2 className="label">To do</h2>
            {todo.length ? <ul className="bucket-list">{todo.map(row)}</ul> : <p className="hint">Everything&rsquo;s done. Time to dream up more.</p>}
          </section>
          {done.length > 0 && (
            <section>
              <h2 className="label">Done</h2>
              <ul className="bucket-list">{done.map(row)}</ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { deleteLesson, saveLesson } from "@/app/actions/notebooks";
import { inkStyle } from "@/lib/inks";
import type { People } from "@/lib/people";
import { longDate } from "@/lib/time";
import type { LessonMeta } from "@/lib/types";
import { Doodle } from "./Doodle";

type Props = {
  postId: string;
  meta: LessonMeta;
  people: People;
  readOnly?: boolean;
  /** The notebook's slug, so deleting can go back to it. */
  deleteFrom?: string;
  /** Open straight into editing (a lesson that was just started). */
  startEditing?: boolean;
};

/**
 * A lesson page both people can fill in. Checking homework and adding
 * questions save right away; everything else is under Edit.
 */
export function LessonSheet({ postId, meta: initial, people, readOnly, deleteFrom, startEditing }: Props) {
  const [meta, setMeta] = useState<LessonMeta>(initial);
  const [editing, setEditing] = useState(Boolean(startEditing) && !readOnly);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [question, setQuestion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ids = Object.keys(people.byId);

  function persist(next: LessonMeta) {
    setMeta(next);
    if (readOnly) return;
    startTransition(async () => {
      const result = await saveLesson(postId, next);
      setError(result.error ?? null);
    });
  }

  const teacher = meta.teacher_id ? people.byId[meta.teacher_id] : null;

  if (editing) {
    const set = (patch: Partial<LessonMeta>) => setMeta((m) => ({ ...m, ...patch }));
    return (
      <form
        className="sheet sheet-edit"
        onSubmit={(e) => {
          e.preventDefault();
          persist(meta);
          setEditing(false);
        }}
      >
        <div className="sheet-head">
          <div className="field">
            <label className="label" htmlFor="lesson-date">Lesson {meta.n} date</label>
            <input id="lesson-date" type="date" value={meta.date ?? ""} onChange={(e) => set({ date: e.target.value || null })} />
          </div>
          <div className="field">
            <label className="label" htmlFor="lesson-teacher">Taught by</label>
            <select id="lesson-teacher" value={meta.teacher_id ?? ""} onChange={(e) => set({ teacher_id: e.target.value || null })}>
              <option value="">Both of us</option>
              {ids.map((id) => <option key={id} value={id}>{people.byId[id].name}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="lesson-topics">What we covered (comma-separated)</label>
          <input
            id="lesson-topics"
            type="text"
            defaultValue={meta.topics.join(", ")}
            onChange={(e) => set({ topics: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })}
            placeholder="ser vs. estar, ordering food, past tense"
          />
        </div>

        <fieldset className="plain-fieldset">
          <legend className="label">Vocabulary</legend>
          <div className="vocab-edit">
            {meta.vocab.map((v, i) => (
              <div key={i} className="vocab-row">
                <input aria-label="Word or phrase" placeholder="la mesa" value={v.term}
                  onChange={(e) => set({ vocab: meta.vocab.map((x, j) => (j === i ? { ...x, term: e.target.value } : x)) })} />
                <input aria-label="Meaning" placeholder="the table" value={v.meaning}
                  onChange={(e) => set({ vocab: meta.vocab.map((x, j) => (j === i ? { ...x, meaning: e.target.value } : x)) })} />
                <input aria-label="Note" placeholder="note (optional)" value={v.note ?? ""}
                  onChange={(e) => set({ vocab: meta.vocab.map((x, j) => (j === i ? { ...x, note: e.target.value } : x)) })} />
                <button type="button" className="btn btn-quiet" aria-label="Remove word"
                  onClick={() => set({ vocab: meta.vocab.filter((_, j) => j !== i) })}>
                  <Doodle name="close" size={12} />
                </button>
              </div>
            ))}
            <button type="button" className="btn" onClick={() => set({ vocab: [...meta.vocab, { term: "", meaning: "" }] })}>
              Add a word
            </button>
          </div>
        </fieldset>

        <fieldset className="plain-fieldset">
          <legend className="label">Homework</legend>
          <div className="vocab-edit">
            {meta.homework.map((h, i) => (
              <div key={i} className="vocab-row two">
                <input aria-label="Homework" value={h.text} placeholder="Write 5 sentences with estar"
                  onChange={(e) => set({ homework: meta.homework.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)) })} />
                <button type="button" className="btn btn-quiet" aria-label="Remove"
                  onClick={() => set({ homework: meta.homework.filter((_, j) => j !== i) })}>
                  <Doodle name="close" size={12} />
                </button>
              </div>
            ))}
            <button type="button" className="btn" onClick={() => set({ homework: [...meta.homework, { text: "" }] })}>
              Add homework
            </button>
          </div>
        </fieldset>

        <div className="field">
          <label className="label" htmlFor="lesson-notes">Notes</label>
          <textarea id="lesson-notes" rows={4} value={meta.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
        </div>

        <div className="dialog-actions">
          {deleteFrom &&
            (confirmDelete ? (
              <span className="lesson-delete-confirm">
                <span>Delete Lesson {meta.n}?</span>
                <button type="button" className="btn btn-quiet" onClick={() => setConfirmDelete(false)}>Keep it</button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => {
                    const fd = new FormData();
                    fd.set("id", postId);
                    fd.set("slug", deleteFrom);
                    startTransition(() => deleteLesson(fd));
                  }}
                >
                  Delete
                </button>
              </span>
            ) : (
              <button type="button" className="btn btn-quiet danger lesson-delete" onClick={() => setConfirmDelete(true)}>
                <Doodle name="trash" size={15} /> Delete lesson
              </button>
            ))}
          <button type="button" className="btn btn-quiet" onClick={() => { setMeta(initial); setEditing(false); }}>Cancel</button>
          <button type="submit" className="btn btn-primary">Save lesson</button>
        </div>
      </form>
    );
  }

  return (
    <article className="sheet">
      <div className="sheet-head">
        <div>
          <span className="label">Lesson {meta.n}</span>
          <h2>{meta.date ? longDate(meta.date) : "No date yet"}</h2>
        </div>
        <div className="sheet-head-side">
          {teacher && <span className="hint">Taught by {teacher.name}</span>}
          {!readOnly && <button type="button" className="btn" onClick={() => setEditing(true)}>Edit</button>}
          {!readOnly && deleteFrom && (
            <details className="nb-menu">
              <summary aria-label="Lesson options">
                <Doodle name="more" size={20} />
              </summary>
              <div className="post-menu-panel">
                <form action={deleteLesson} className="menu-confirm">
                  <input type="hidden" name="id" value={postId} />
                  <input type="hidden" name="slug" value={deleteFrom} />
                  <span>Delete Lesson {meta.n}? Its vocabulary, homework, and notes go with it. Unanswered questions move to your latest lesson.</span>
                  <button type="submit" className="btn btn-danger">Delete lesson</button>
                </form>
              </div>
            </details>
          )}
        </div>
      </div>

      {meta.topics.length > 0 && (
        <section>
          <h3 className="label">What we covered</h3>
          <div className="chips">{meta.topics.map((t) => <span key={t} className="chip">{t}</span>)}</div>
        </section>
      )}

      {meta.vocab.length > 0 && (
        <section>
          <h3 className="label">Vocabulary</h3>
          <div className="table-scroll">
            <table className="vocab">
              <tbody>
                {meta.vocab.map((v, i) => (
                  <tr key={i}>
                    <td lang="es">{v.term}</td>
                    <td>{v.meaning}</td>
                    <td>{v.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {meta.homework.length > 0 && (
        <section>
          <h3 className="label">Homework</h3>
          <ul className="homework">
            {meta.homework.map((h, i) => {
              const by = h.done_by ? people.byId[h.done_by] : null;
              return (
                <li key={i}>
                  <label style={by ? inkStyle(by.ink) : undefined}>
                    <input
                      type="checkbox"
                      checked={Boolean(h.done_by)}
                      disabled={readOnly}
                      onChange={(e) =>
                        persist({
                          ...meta,
                          homework: meta.homework.map((x, j) => (j === i ? { ...x, done_by: e.target.checked ? people.meId : null } : x)),
                        })
                      }
                    />
                    <span className="box" aria-hidden>{by && <Doodle name="check" size={14} />}</span>
                    <span>{h.text}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {meta.notes && (
        <section>
          <h3 className="label">Notes</h3>
          <p className="sheet-notes">{meta.notes}</p>
        </section>
      )}

      <section>
        <h3 className="label">Questions for next lesson</h3>
        <ul className="questions">
          {meta.questions.map((q, i) => {
            const by = people.byId[q.by];
            return (
              <li key={i} className={q.answered ? "answered" : undefined} style={by ? inkStyle(by.ink) : undefined}>
                <span className="ink-dot" />
                <span className="q-text">{q.text}</span>
                {!readOnly && (
                  <button
                    type="button"
                    className="btn btn-quiet"
                    onClick={() => persist({ ...meta, questions: meta.questions.map((x, j) => (j === i ? { ...x, answered: !x.answered } : x)) })}
                  >
                    {q.answered ? "Not answered" : "Answered"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {!readOnly && (
          <form
            className="question-add"
            onSubmit={(e) => {
              e.preventDefault();
              if (!question.trim()) return;
              persist({ ...meta, questions: [...meta.questions, { text: question.trim(), by: people.meId }] });
              setQuestion("");
            }}
          >
            <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Add a question…" maxLength={500} aria-label="Add a question" />
            {question.trim() && <button type="submit" className="btn">Add</button>}
          </form>
        )}
        <p className="hint">Unanswered questions move to the next lesson when it&rsquo;s created.</p>
      </section>

      {(error || pending) && <p className={error ? "error-note" : "hint"} role="status">{error ? <b>{error}</b> : "Saving…"}</p>}
    </article>
  );
}

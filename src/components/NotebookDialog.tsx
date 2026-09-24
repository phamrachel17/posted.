"use client";

import { useActionState, useRef, useState } from "react";
import { createNotebook, updateNotebook } from "@/app/actions/notebooks";
import type { FormState } from "@/lib/forms";
import { COVERS, NOTEBOOK_DOODLES, isTextDoodle } from "@/lib/notebooks";
import type { Notebook } from "@/lib/types";
import { Doodle } from "./Doodle";
import { SubmitButton } from "./SubmitButton";

type Props = {
  /** Edit this notebook; omit to start a new one. */
  notebook?: Notebook;
  trigger: React.ReactNode;
  triggerClassName?: string;
  /** Accessible name when the trigger is only an icon. */
  triggerLabel?: string;
};

export function NotebookDialog({ notebook, trigger, triggerClassName, triggerLabel }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const action = notebook ? updateNotebook.bind(null, notebook.id) : createNotebook;
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const startText = isTextDoodle(notebook?.doodle);
  const [doodle, setDoodle] = useState(startText ? "text" : (notebook?.doodle ?? "nb-book"));

  return (
    <>
      <button type="button" className={triggerClassName} aria-label={triggerLabel} title={triggerLabel} onClick={() => ref.current?.showModal()}>
        {trigger}
      </button>
      <dialog ref={ref} className="dialog" aria-labelledby="nb-dialog-title">
        <form action={formAction} className="form">
          <h2 id="nb-dialog-title">{notebook ? "Edit notebook" : "Start a notebook"}</h2>

          <div className="field">
            <label className="label" htmlFor="nb-name">Name</label>
            <input id="nb-name" name="name" type="text" required maxLength={40} defaultValue={notebook?.name} autoFocus />
          </div>

          <fieldset className="field plain-fieldset">
            <legend className="label">Doodle</legend>
            <div className="doodle-pick">
              {NOTEBOOK_DOODLES.map((d) => (
                <label key={d} className={doodle === d ? "on" : undefined}>
                  <input type="radio" name="doodle" value={d} checked={doodle === d} onChange={() => setDoodle(d)} />
                  <Doodle name={d} size={22} />
                  <span className="visually-hidden">{d.replace("nb-", "")}</span>
                </label>
              ))}
              <label className={doodle === "text" ? "on" : undefined}>
                <input type="radio" name="doodle" value="text" checked={doodle === "text"} onChange={() => setDoodle("text")} />
                <span aria-hidden>Aa</span>
                <span className="visually-hidden">An emoji or letter</span>
              </label>
            </div>
            {doodle === "text" && (
              <input
                name="doodle_text"
                type="text"
                maxLength={8}
                defaultValue={startText ? notebook!.doodle!.slice(5) : ""}
                placeholder="An emoji or a letter"
                aria-label="Emoji or letter"
              />
            )}
          </fieldset>

          <fieldset className="field plain-fieldset">
            <legend className="label">Cover</legend>
            <div className="cover-pick">
              {Object.entries(COVERS).map(([id, color]) => (
                <label key={id} style={{ background: color }} title={id}>
                  <input type="radio" name="cover" value={id} defaultChecked={(notebook?.cover ?? "stone") === id} aria-label={id} />
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field">
            <label className="label" htmlFor="nb-desc">A line about it (optional)</label>
            <input id="nb-desc" name="description" type="text" maxLength={140} defaultValue={notebook?.description ?? ""}
              placeholder="What's this notebook for?" />
          </div>

          <label className="check-row">
            <input type="checkbox" name="lessons" defaultChecked={notebook?.kind === "lessons"} />
            <span>
              <b>Lesson notebook</b>
              <span className="hint">Adds numbered weekly lessons with vocabulary, homework, and questions for next time.</span>
            </span>
          </label>

          {state.error && <p className="error-note"><b>{state.error}</b></p>}
          <div className="dialog-actions">
            <button type="button" className="btn btn-quiet" onClick={() => ref.current?.close()}>Cancel</button>
            <SubmitButton pendingText="Saving…">{notebook ? "Save" : "Start notebook"}</SubmitButton>
          </div>
        </form>
      </dialog>
    </>
  );
}

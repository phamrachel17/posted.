"use client";

import { useActionState, useState } from "react";
import { createInvite, updateLetter, updateProfile, updateVisit } from "@/app/actions/space";
import type { FormState } from "@/lib/forms";
import type { Ink } from "@/lib/inks";
import { ProfileFields } from "./ProfileFields";
import { SubmitButton } from "./SubmitButton";

function Result({ state }: { state: FormState }) {
  if (state.error) return <p className="error-note"><b>{state.error}</b></p>;
  if (state.ok && state.message) return <span className="hint" role="status">{state.message}</span>;
  return null;
}

export function ProfileForm(props: {
  defaults: { display_name: string; ink: Ink; city: string; timezone: string };
  takenInk: Ink | null;
}) {
  const [state, action] = useActionState<FormState, FormData>(updateProfile, {});
  return (
    <form action={action} className="form">
      <ProfileFields defaults={props.defaults} takenInk={props.takenInk} />
      <div className="settings-actions">
        <SubmitButton pendingText="Saving…">Save</SubmitButton>
        <Result state={state} />
      </div>
    </form>
  );
}

export function VisitForm({ date, place }: { date: string | null; place: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(updateVisit, {});
  return (
    <form action={action} className="form">
      <div className="field">
        <label className="label" htmlFor="next_visit_on">Next time together</label>
        <input id="next_visit_on" name="next_visit_on" type="date" defaultValue={date ?? ""} />
        <span className="hint">Shows a countdown on Today. Leave it empty to hide it.</span>
      </div>
      <div className="field">
        <label className="label" htmlFor="next_visit_place">Where (optional)</label>
        <input id="next_visit_place" name="next_visit_place" type="text" maxLength={60} defaultValue={place ?? ""} />
      </div>
      <div className="settings-actions">
        <SubmitButton pendingText="Saving…">Save</SubmitButton>
        <Result state={state} />
      </div>
    </form>
  );
}

export function InviteBox({ origin }: { origin: string }) {
  const [state, action] = useActionState<FormState, FormData>(createInvite, {});
  const [copied, setCopied] = useState(false);
  const link = state.ok && state.message ? `${origin}/invite/${state.message}` : null;

  if (!link) {
    return (
      <form action={action} className="settings-actions">
        <SubmitButton pendingText="Making a link…">Make an invite link</SubmitButton>
        <span className="hint">It works once, for 7 days. Making a new one cancels the old one.</span>
        {state.error && <p className="error-note"><b>{state.error}</b></p>}
      </form>
    );
  }

  return (
    <div className="invite-box">
      <code>{link}</code>
      <button
        type="button"
        className="btn"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

function hourLabel(h: number) {
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${h < 12 ? "am" : "pm"}`;
}

export function LetterForm({ hour, partnerName }: { hour: number | null; partnerName: string | null }) {
  const [state, action] = useActionState<FormState, FormData>(updateLetter, {});
  return (
    <form action={action} className="form">
      <div className="field">
        <label className="label" htmlFor="daily_letter_hour">Daily letter</label>
        <select id="daily_letter_hour" name="daily_letter_hour" defaultValue={hour ?? ""}>
          <option value="">Off</option>
          {Array.from({ length: 24 }, (_, h) => (
            <option key={h} value={h}>Around {hourLabel(h)}</option>
          ))}
        </select>
        <span className="hint">
          One short email, only on days {partnerName ?? "the other person"} left you something. Nothing is sent on quiet days.
        </span>
      </div>
      <div className="settings-actions">
        <SubmitButton pendingText="Saving…">Save</SubmitButton>
        <Result state={state} />
      </div>
    </form>
  );
}

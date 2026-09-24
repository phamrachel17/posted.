"use client";

import { useActionState } from "react";
import { sendMagicLink } from "@/app/actions/auth";
import { SubmitButton } from "./SubmitButton";
import type { FormState } from "@/lib/forms";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(sendMagicLink, {});

  if (state.ok) {
    return (
      <p className="solo-lede">
        Check {state.message}. The link in that email signs you in on this browser.
      </p>
    );
  }

  return (
    <form action={action} className="form">
      <input type="hidden" name="next" value={next ?? "/"} />
      <div className="field">
        <label className="label" htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required autoComplete="email" autoFocus />
      </div>
      {state.error && <p className="error-note"><b>{state.error}</b></p>}
      <div>
        <SubmitButton pendingText="Sending…">Email me a sign-in link</SubmitButton>
      </div>
    </form>
  );
}

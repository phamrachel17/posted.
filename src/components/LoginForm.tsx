"use client";

import { useActionState, useState } from "react";
import { sendMagicLink, signInWithPassword, signUpWithPassword } from "@/app/actions/auth";
import { SubmitButton } from "./SubmitButton";
import type { FormState } from "@/lib/forms";

type Mode = "password" | "create" | "link";

type Props = {
  next?: string;
  /** Start on "create a password" (the invite page, for someone new). */
  newcomer?: boolean;
};

export function LoginForm({ next, newcomer }: Props) {
  const [mode, setMode] = useState<Mode>(newcomer ? "create" : "password");
  const [linkState, linkAction] = useActionState<FormState, FormData>(sendMagicLink, {});
  const [signInState, signInAction] = useActionState<FormState, FormData>(signInWithPassword, {});
  const [createState, createAction] = useActionState<FormState, FormData>(signUpWithPassword, {});

  const state = mode === "link" ? linkState : mode === "create" ? createState : signInState;
  const action = mode === "link" ? linkAction : mode === "create" ? createAction : signInAction;

  if (mode === "link" && linkState.ok) {
    return <p className="solo-lede">Check {linkState.message}. The link in that email signs you in.</p>;
  }
  if (mode === "create" && createState.ok) {
    return <p className="solo-lede">{createState.message}</p>;
  }

  return (
    <div className="form">
      <div className="auth-tabs" role="tablist" aria-label="How to sign in">
        <button type="button" role="tab" aria-selected={mode !== "link"} onClick={() => setMode(newcomer ? "create" : "password")}>
          Password
        </button>
        <button type="button" role="tab" aria-selected={mode === "link"} onClick={() => setMode("link")}>
          Email me a link
        </button>
      </div>

      <form action={action} className="form" key={mode}>
        <input type="hidden" name="next" value={next ?? "/"} />
        <div className="field">
          <label className="label" htmlFor="email">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email" autoFocus />
        </div>
        {mode !== "link" && (
          <div className="field">
            <label className="label" htmlFor="password">{mode === "create" ? "Choose a password" : "Password"}</label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={mode === "create" ? 8 : undefined}
              autoComplete={mode === "create" ? "new-password" : "current-password"}
            />
            {mode === "create" && <span className="hint">At least 8 characters.</span>}
          </div>
        )}

        {state.error && <p className="error-note"><b>{state.error}</b></p>}

        <div className="auth-actions">
          {mode === "link" && <SubmitButton pendingText="Sending…">Email me a sign-in link</SubmitButton>}
          {mode === "password" && <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>}
          {mode === "create" && <SubmitButton pendingText="Creating…">Create account</SubmitButton>}

          {mode === "password" && newcomer && (
            <button type="button" className="btn btn-quiet" onClick={() => setMode("create")}>New here? Create a password</button>
          )}
          {mode === "create" && (
            <button type="button" className="btn btn-quiet" onClick={() => setMode("password")}>Already have a password? Sign in</button>
          )}
        </div>
      </form>
    </div>
  );
}

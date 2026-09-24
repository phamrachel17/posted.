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
      {mode === "link" && (
        <p className="hint">We&rsquo;ll email you a one-time link that signs you in. Once you&rsquo;re in, you can set a new password under You two.</p>
      )}

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
            {mode === "password" && (
              <button type="button" className="text-link" onClick={() => setMode("link")}>
                Forgot your password?
              </button>
            )}
            {mode === "create" && (
              <span className="hint">
                At least 8 characters.
                {!newcomer && " This starts a new space for you. To join someone\u2019s space, open the invite link they sent you."}
              </span>
            )}
          </div>
        )}

        {state.error && <p className="error-note"><b>{state.error}</b></p>}

        <div className="auth-actions">
          {mode === "link" && <SubmitButton pendingText="Sending…">Email me a sign-in link</SubmitButton>}
          {mode === "password" && <SubmitButton pendingText="Signing in…">Sign in</SubmitButton>}
          {mode === "create" && <SubmitButton pendingText="Creating…">Create account</SubmitButton>}

          {mode === "password" && (
            <button type="button" className="btn btn-quiet" onClick={() => setMode("create")}>
              {newcomer ? "New here? Create a password" : "New here? Create an account"}
            </button>
          )}
          {mode === "create" && (
            <button type="button" className="btn btn-quiet" onClick={() => setMode("password")}>Already have a password? Sign in</button>
          )}
          {mode === "link" && (
            <button type="button" className="btn btn-quiet" onClick={() => setMode(newcomer ? "create" : "password")}>Back to password</button>
          )}
        </div>
      </form>
    </div>
  );
}

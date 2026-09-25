"use client";

import { useActionState } from "react";
import { createSpace } from "@/app/actions/space";
import { ProfileFields } from "./ProfileFields";
import { SubmitButton } from "./SubmitButton";
import type { FormState } from "@/lib/forms";

export function WelcomeForm({ submitLabel = "Set up our space" }: { submitLabel?: string }) {
  const [state, action] = useActionState<FormState, FormData>(createSpace, {});
  return (
    <form action={action} className="form">
      <ProfileFields />
      {state.error && <p className="error-note"><b>{state.error}</b></p>}
      <div>
        <SubmitButton pendingText="Setting up…">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}

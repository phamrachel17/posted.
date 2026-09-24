"use client";

import { useActionState } from "react";
import { acceptInvite } from "@/app/actions/space";
import { ProfileFields } from "./ProfileFields";
import { SubmitButton } from "./SubmitButton";
import type { FormState } from "@/lib/forms";
import type { Ink } from "@/lib/inks";

export function JoinForm({ token, takenInk }: { token: string; takenInk: Ink }) {
  const [state, action] = useActionState<FormState, FormData>(acceptInvite.bind(null, token), {});
  return (
    <form action={action} className="form">
      <ProfileFields takenInk={takenInk} />
      {state.error && <p className="error-note"><b>{state.error}</b></p>}
      <div>
        <SubmitButton pendingText="Joining…">Join</SubmitButton>
      </div>
    </form>
  );
}

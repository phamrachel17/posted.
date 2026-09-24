import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUs, getUserId } from "@/lib/data";
import { isInk } from "@/lib/inks";
import { JoinForm } from "@/components/JoinForm";
import { LoginForm } from "@/components/LoginForm";
import { Doodle } from "@/components/Doodle";

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  if (await getUs()) redirect("/");

  const supabase = await createClient();
  const { data } = await supabase.rpc("invite_preview", { p_token: token });
  const invite = (data as { inviter_name: string; taken_ink: string; is_valid: boolean }[] | null)?.[0];

  if (!invite?.is_valid || !isInk(invite.taken_ink)) {
    return (
      <main className="solo">
        <div className="solo-inner">
          <div className="brand-solo">
          <Doodle name="logo" size={180} height={138} />
          <div className="wordmark">posted<span>.</span></div>
        </div>
          <p className="solo-lede">This invite link has expired or was already used.</p>
          <p>Ask for a new one. They can make it under You two in their settings.</p>
        </div>
      </main>
    );
  }

  const signedIn = Boolean(await getUserId());

  return (
    <main className="solo">
      <div className="solo-inner">
        <div className="brand-solo">
          <Doodle name="logo" size={180} height={138} />
          <div className="wordmark">posted<span>.</span></div>
        </div>
        <p className="solo-lede">
          {invite.inviter_name} made a private place for the two of you.
          {signedIn ? " A little about you, and you're in." : " Sign in with your email to join."}
        </p>
        {signedIn ? (
          <JoinForm token={token} takenInk={invite.taken_ink} />
        ) : (
          <LoginForm next={`/invite/${token}`} />
        )}
      </div>
    </main>
  );
}

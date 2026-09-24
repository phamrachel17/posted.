import { redirect } from "next/navigation";
import { LoginForm } from "@/components/LoginForm";
import { getUserId } from "@/lib/data";
import { safeNext } from "@/lib/forms";
import { Doodle } from "@/components/Doodle";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = await searchParams;
  // Already signed in: skip the form.
  if (await getUserId()) redirect(safeNext(next));

  return (
    <main className="solo">
      <div className="solo-inner">
        <div className="brand-solo">
          <Doodle name="logo" size={180} height={138} />
          <div className="wordmark">posted<span>.</span></div>
        </div>
        <p className="solo-lede">
          A private place for two people to leave pieces of their day for each other.
        </p>
        {error && (
          <p className="error-note">
            <b>That sign-in link didn&rsquo;t work.</b>
            <span>
              {error === "different-browser"
                ? "It opened in a different browser from the one that asked for it. Request a new link below, then open the email on this same device and browser."
                : error === "expired"
                  ? "It was already used or has expired. Request a new one below."
                  : "Links expire after an hour and can only be used once. Request a new one below."}
            </span>
          </p>
        )}
        <LoginForm next={typeof next === "string" ? next : undefined} />

        <section className="how" aria-labelledby="how-title">
          <h2 id="how-title" className="label">How posted. works</h2>
          <ol>
            <li>
              <b>One of you starts a space.</b>
              <span>Create an account and set up your name, ink color, and city. That makes a new, empty space that belongs to you.</span>
            </li>
            <li>
              <b>Invite your person.</b>
              <span>From You two, make a private invite link and send it to them. It works once and expires after 7 days.</span>
            </li>
            <li>
              <b>The space closes at two.</b>
              <span>Once they join, nobody else can get in, not even with a new invite. Everything you post is visible only to the two of you.</span>
            </li>
          </ol>
          <p className="hint">
            Got an invite link? Open it directly. It will let you create your account and join. Creating an account here instead starts a separate space.
          </p>
        </section>
      </div>
    </main>
  );
}

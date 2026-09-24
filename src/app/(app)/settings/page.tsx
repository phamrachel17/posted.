import { headers } from "next/headers";
import { getUs } from "@/lib/data";
import { signOut } from "@/app/actions/auth";
import { InviteBox, LetterForm, ProfileForm, VisitForm } from "@/components/SettingsForms";

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function SettingsPage() {
  const us = await getUs();
  if (!us) return null;
  const { me, partner, space } = us;

  return (
    <main className="main settings">
      <h1 className="page-title">You two</h1>

      <section aria-labelledby="you">
        <h2 id="you" className="label">You</h2>
        <ProfileForm
          defaults={{ display_name: me.display_name, ink: me.ink, city: me.city, timezone: me.timezone }}
          takenInk={partner?.ink ?? null}
        />
      </section>

      <section aria-labelledby="invite-title" id="invite">
        <h2 id="invite-title" className="label">{partner ? "Together" : "Invite"}</h2>
        {partner ? (
          <p>You and {partner.display_name} are both here. posted. is closed to anyone else.</p>
        ) : (
          <>
            <p>Send this link to the other person however you like. Once they join, the space is sealed at two.</p>
            <InviteBox origin={await origin()} />
          </>
        )}
      </section>

      <section aria-labelledby="visit">
        <h2 id="visit" className="label">Next visit</h2>
        <VisitForm date={space.next_visit_on} place={space.next_visit_place} />
      </section>

      <section aria-labelledby="letter">
        <h2 id="letter" className="label">Email</h2>
        <LetterForm hour={me.daily_letter_hour} partnerName={partner?.display_name ?? null} />
      </section>

      <section aria-labelledby="export">
        <h2 id="export" className="label">Export everything</h2>
        <p>A .zip of every post, note, and reaction, with the original photos and voice memos. It can take a minute.</p>
        <div>
          <a href="/api/export" className="btn" download>Download a copy</a>
        </div>
      </section>

      <section aria-labelledby="account">
        <h2 id="account" className="label">This browser</h2>
        <form action={signOut}>
          <button type="submit" className="btn">Sign out</button>
        </form>
      </section>
    </main>
  );
}

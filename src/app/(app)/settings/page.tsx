import { headers } from "next/headers";
import { getMySpaces, getStampBook, getUs } from "@/lib/data";
import { peopleOf } from "@/lib/people";
import { signOut } from "@/app/actions/auth";
import { AvatarPicker } from "@/components/AvatarPicker";
import { SpaceList } from "@/components/SpaceSwitcher";
import { StampSettings } from "@/components/StampSettings";
import { SpotifyConnect, SpotifyNotice } from "@/components/SpotifyConnect";
import { spotifyStatus } from "@/lib/spotify-auth";
import { cityPhoto } from "@/lib/city-photo";
import { InviteBox, LetterForm, PasswordForm, ProfileForm, VisitForm } from "@/components/SettingsForms";
import { Doodle } from "@/components/Doodle";

async function origin() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const { spotify: spotifyResult } = await searchParams;
  const us = await getUs();
  if (!us) return null;
  const { me, partner, space } = us;
  const spaces = (await getMySpaces()).map((s) => ({
    id: s.space_id,
    myName: s.my_name,
    myInk: s.my_ink,
    partnerName: s.partner_name,
    partnerInk: s.partner_ink,
    active: s.is_active,
  }));

  return (
    <main className="main settings">
      <header className="page-head">
        <h1 className="page-title">
          <Doodle name="nav-you-two" size={40} className="title-icon" />
          Settings
        </h1>
      </header>

      <section aria-labelledby="you">
        <h2 id="you" className="label">You</h2>
        <AvatarPicker spaceId={space.id} name={me.display_name} ink={me.ink} url={me.avatar_url ?? null} />
        <ProfileForm
          defaults={{ display_name: me.display_name, ink: me.ink, city: me.city, timezone: me.timezone }}
          takenInk={partner?.ink ?? null}
        />
      </section>

      <section aria-labelledby="stamp-title">
        <h2 id="stamp-title" className="label">Your stamp</h2>
        <StampSettings defaultStamp={me.stamp} book={await getStampBook()} people={peopleOf(us)} city={{ city: me.city, url: await cityPhoto(me.city, me.timezone) }} />
      </section>

      <section aria-labelledby="invite-title" id="invite">
        <h2 id="invite-title" className="label">{partner ? "Together" : "Invite"}</h2>
        {partner ? (
          <p>You and {partner.display_name} are both here. This space is closed to anyone else.</p>
        ) : (
          <>
            <p>Send this link to the other person however you like. Once they join, the space is sealed at two.</p>
            <InviteBox origin={await origin()} />
          </>
        )}
      </section>

      <section aria-labelledby="spaces-title">
        <h2 id="spaces-title" className="label">Your spaces</h2>
        <p>Each space is just two people. Your name, ink, and posts in one never show up in another.</p>
        <SpaceList spaces={spaces} />
      </section>

      <section aria-labelledby="visit">
        <h2 id="visit" className="label">Next visit</h2>
        <VisitForm date={space.next_visit_on} place={space.next_visit_place} />
      </section>

      <section aria-labelledby="spotify-title" id="spotify">
        <h2 id="spotify-title" className="label">Spotify</h2>
        <SpotifyNotice status={spotifyResult} />
        <SpotifyConnect {...await spotifyStatus()} />
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

      <section aria-labelledby="password-title">
        <h2 id="password-title" className="label">Signing in</h2>
        <PasswordForm />
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

import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { TodayView } from "@/components/TodayView";
import { PresenceProvider } from "@/components/Presence";
import { inkStyle } from "@/lib/inks";
import { localStamp } from "@/lib/time";
import type { Member, Post, Us } from "@/lib/types";
import { stampDesign } from "@/lib/stamps";
import { cityPhoto } from "@/lib/city-photo";

// Sample content for looking at the design without a database.
// Only available in development.

const HOUR = 3_600_000;

const photo = (a: string, b: string, c: string, portrait = false) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 560"${portrait ? ' width="560" height="800" preserveAspectRatio="xMidYMid slice"' : ""}><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset=".6" stop-color="${b}"/><stop offset="1" stop-color="${c}"/></linearGradient></defs><rect width="800" height="560" fill="url(#g)"/><circle cx="260" cy="250" r="70" fill="#E79A4B"/><circle cx="420" cy="310" r="64" fill="#DB8540"/><circle cx="560" cy="230" r="58" fill="#E9A659"/></svg>`,
  )}`;

const peaks = (seed: number) =>
  Array.from({ length: 64 }, (_, i) => {
    const env = Math.sin((Math.PI * (i + 0.5)) / 64) * 0.55 + 0.45;
    const r = Math.abs(Math.sin(seed * 9.1 + i * 1.7));
    return Math.round(10 + env * (30 + r * 60));
  });

export default async function PreviewPage() {
  const [seattle, brooklyn] = await Promise.all([cityPhoto("Seattle", "America/Los_Angeles"), cityPhoto("Brooklyn", "America/New_York")]);
  if (process.env.NODE_ENV === "production") notFound();

  const now = new Date();
  const me: Member = {
    id: "rachel", space_id: "s", user_id: "u1", display_name: "Rachel", ink: "blue", city: "Brooklyn",
    timezone: "America/New_York", last_seen_at: new Date(now.getTime() - 20 * HOUR).toISOString(), daily_letter_hour: null,
    avatar_path: null, stamp: null,
  };
  const partner: Member = {
    id: "arya", space_id: "s", user_id: "u2", display_name: "Arya", ink: "verdigris", city: "Seattle",
    timezone: "America/Los_Angeles", last_seen_at: null, daily_letter_hour: null,
    avatar_path: null, stamp: null,
  };
  const visit = new Date(now.getTime() + 18 * 24 * HOUR).toISOString().slice(0, 10);
  const us: Us = { me, partner, space: { id: "s", name: null, next_visit_on: visit, next_visit_place: "Seattle" } };

  const post = (id: string, who: Member, hoursAgo: number, rest: Partial<Post>): Post => {
    const created = new Date(now.getTime() - hoursAgo * HOUR);
    return {
      id, author_id: who.id, kind: "note", body: null, meta: {}, created_at: created.toISOString(), edited_at: null,
      notebook: null, photos: [], audio: null, reactions: [], latestReply: null, kept: false,
      postmark: { city: who.city, tz: who.timezone, local: localStamp(created, who.timezone) },
      ...rest,
    };
  };

  const posts: Post[] = [
    post("p1", partner, 3, {
      kind: "day",
      stamp: { kind: "city", city: "Seattle", url: seattle },
      meta: {
        mood: "happy", energy: 4,
        highlight: "Presented the migration plan. Nobody asked the question I was dreading.",
        accomplished: "Finally finished the onboarding doc.",
        grateful: "The guy with the three corgis.",
        note: "Walked home the long way along the canal. The light was doing that thing again.",
      },
    }),
    post("p2", partner, 7, {
      stamp: { kind: "design", design: stampDesign("record")! },
      kind: "voice", body: "The guy with the three corgis was back.",
      audio: { id: "a1", url: null, mime: "audio/webm", duration_ms: 42_000, peaks: peaks(1) },
    }),
    post("p3", partner, 18, {
      stamp: { kind: "design", design: stampDesign("heart")! },
      body: "Question for Sunday: why is it “estoy cansada” and not “soy cansada”? I've been saying it wrong for a month.",
    }),
    post("p4", me, 24, {
      stamp: { kind: "photo", url: photo("#8C6F55", "#5E4838", "#46352A", true) },
      kind: "photo", body: "First persimmons at the market. Saving you the ugliest one. Listening to this on the walk home:\nhttps://open.spotify.com/album/1mJFgPeuLhU1PzLNBURdJC?si=19a4hlvKTSWKJeVqmHgjeg",
      photos: [
        { id: "ph1", url: photo("#8C6F55", "#5E4838", "#46352A", true), width: 3024, height: 4032 },
        { id: "ph2", url: photo("#6F8FA8", "#3D5A73", "#2A3F52", true), width: 3024, height: 4032 },
      ],
      reactions: [{ member_id: "arya", emoji: "heart" }, { member_id: "arya", emoji: "🥹" }],
      latestReply: { id: "r1", author_id: "arya", body: "The ugliest one is the best one.", hasAudio: false },
      kept: true,
    }),
    post("p5", me, 50, {
      stamp: { kind: "city", city: "Brooklyn", url: brooklyn },
      body: "Just watched Red and I have SO many thoughts about Michael and Kay.",
      reactions: [{ member_id: "arya", emoji: "😂" }],
    }),
  ];

  return (
    <PresenceProvider spaceId="s" meId="rachel" preview={["rachel", "arya"]}>
      <div className="shell">
        <AppNav
          active="/"
          me={{ name: me.display_name, style: inkStyle(me.ink) }}
          partner={{ id: partner.id, name: partner.display_name, style: inkStyle(partner.ink) }}
          spaces={[
            { id: "s", myName: "Rachel", myInk: "blue", partnerName: "Arya", partnerInk: "verdigris", active: true },
            { id: "s2", myName: "Rach", myInk: "light-pink", partnerName: "Sam", partnerInk: "teal", active: false },
          ]}
          notebooks={[
            { id: "nb-spanish", slug: "spanish", name: "Spanish", doodle: "nb-language", isNew: true },
            { id: "nb-movies", slug: "movies", name: "Movies", doodle: "nb-popcorn", isNew: false },
            { id: "nb-music", slug: "music", name: "Music", doodle: "nb-music", isNew: true },
            { id: "nb-cooking", slug: "cooking", name: "Cooking", doodle: "nb-cooking", isNew: false },
            { id: "nb-books", slug: "books", name: "Books", doodle: "nb-reading", isNew: false },
          ]}
        />
        <TodayView
          us={us}
          posts={posts}
          now={now}
          preview
          cityStampUrl={brooklyn}
          stampBook={[
            { id: "sb1", path: "s/stamp-a.jpg", url: photo("#6F8FA8", "#3D5A73", "#2A3F52", false), addedBy: "arya" },
            { id: "sb2", path: "s/stamp-b.jpg", url: photo("#8C6F55", "#5E4838", "#46352A", true), addedBy: "rachel" },
          ]}
          jukebox={{
            current: {
              id: "j1", kind: "track", spotify_id: "4cOdK2wGLETKBW3PvgPWqT", title: "Never Gonna Give You Up", artist: "Rick Astley",
              image: "https://i.scdn.co/image/ab67616d0000b273baf89eb11ec7c657805d2da0", set_by: "arya", created_at: new Date(now.getTime() - 20 * HOUR).toISOString(),
              preview: "https://p.scdn.co/mp3-preview/b4c682084c3fd05538726d0a126b7e14b6e92c83",
            },
            earlier: [
              { id: "j2", kind: "track", spotify_id: "4cOdK2wGLETKBW3PvgPWqT", title: "Harvest Moon", artist: "Neil Young", image: null, set_by: "rachel", created_at: now.toISOString(), preview: null },
            ],
          }}
        />
      </div>
    </PresenceProvider>
  );
}

import { notFound } from "next/navigation";
import { AppNav } from "@/components/AppNav";
import { ScrapbookSpread } from "@/components/ScrapbookSpread";
import { ScrapbookTabs } from "@/components/ScrapbookTabs";
import { inkStyle } from "@/lib/inks";
import { localStamp } from "@/lib/time";
import type { Post } from "@/lib/types";

// Sample scrapbook page for checking the design. Development only.

const HOUR = 3_600_000;
const photo = (a: string, b: string) =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="400" height="500" fill="url(#g)"/></svg>`,
  )}`;

export default function ScrapbookPreview() {
  if (process.env.NODE_ENV === "production") notFound();
  const now = new Date();
  const post = (id: string, who: "rachel" | "arya", daysAgo: number, rest: Partial<Post>): Post => {
    const created = new Date(now.getTime() - daysAgo * 24 * HOUR);
    const tz = who === "rachel" ? "America/New_York" : "America/Los_Angeles";
    return {
      id, author_id: who, kind: "note", body: null, meta: {}, created_at: created.toISOString(), edited_at: null,
      notebook: null, photos: [], audio: null, reactions: [], latestReply: null, kept: false, inScrapbook: true,
      postmark: { city: who === "rachel" ? "Brooklyn" : "Seattle", tz, local: localStamp(created, tz) },
      ...rest,
    };
  };
  const items = [
    { id: "s1", title: "First persimmons", post: post("a", "rachel", 1, { kind: "photo", body: "Saving you the ugliest one.", photos: [{ id: "p1", url: photo("#b0714a", "#4e3a2c"), width: 400, height: 500 }] }) },
    { id: "s2", title: null, post: post("b", "arya", 2, { kind: "voice", body: "The corgis were back.", audio: { id: "v1", url: null, mime: "audio/webm", duration_ms: 42000, peaks: Array.from({ length: 64 }, (_, i) => 20 + Math.round(60 * Math.abs(Math.sin(i * 0.7)))) } }) },
    { id: "s3", title: "The good kind of tired", post: post("c", "arya", 4, { kind: "day", meta: { weather: "bright-spells", today: "Presented the migration plan." } }) },
    { id: "s4", title: null, post: post("d", "rachel", 6, { body: "I keep thinking about the way you said “we'll figure it out” like it was already true." }) },
    { id: "s5", title: "Seattle, finally", post: post("e", "arya", 9, { kind: "photo", photos: [{ id: "p2", url: photo("#8fb0c9", "#2f4a5f"), width: 400, height: 500 }, { id: "p3", url: photo("#c9b08f", "#5f4a2f"), width: 400, height: 500 }] }) },
  ];
  const people = { rachel: { name: "Rachel", ink: "blue" as const }, arya: { name: "Arya", ink: "verdigris" as const } };
  return (
    <div className="shell">
      <AppNav active="/scrapbook" me={{ name: "Rachel", style: inkStyle("blue") }} partner={{ id: "arya", name: "Arya", style: inkStyle("verdigris") }}
        notebooks={[{ slug: "spanish", name: "Spanish", doodle: "nb-language", isNew: true }, { slug: "movies", name: "Movies", doodle: "nb-popcorn", isNew: false }]} />
      <main className="main wide" style={inkStyle("blue")}>
        <ScrapbookTabs current="months" />
        <nav className="month-nav"><span className="month-step">‹ August</span><h2>September 2026</h2><span /></nav>
        <ScrapbookSpread items={items} people={people} label="September 2026" />
      </main>
    </div>
  );
}

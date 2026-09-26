import { FEED_PAGE, getFeed, getJukebox, getStampBook, getUs } from "@/lib/data";
import { cityPhoto } from "@/lib/city-photo";
import { SeenBeacon } from "@/components/SeenBeacon";
import { TodayView } from "@/components/TodayView";

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  const { before, record, spotify } = await searchParams;
  const olderThan = typeof before === "string" && !Number.isNaN(Date.parse(before)) ? before : undefined;

  // Everything the page needs, fetched at once rather than one after another.
  const usPromise = getUs();
  const [us, posts, jukebox, stampBook, cityStampUrl] = await Promise.all([
    usPromise,
    getFeed({ before: olderThan }),
    getJukebox(),
    getStampBook(),
    usPromise.then((u) => (u ? cityPhoto(u.me.city, u.me.timezone) : null)),
  ]);
  if (!us) return null; // The layout redirects before this renders.

  const olderHref = posts.length === FEED_PAGE ? `/?before=${encodeURIComponent(posts[posts.length - 1].created_at)}` : null;

  return (
    <>
      <TodayView
        us={us}
        posts={posts}
        now={new Date()}
        olderHref={olderHref}
        older={Boolean(olderThan)}
        startRecording={record === "1"}
        jukebox={jukebox.missing ? null : jukebox}
        stampBook={stampBook}
        cityStampUrl={cityStampUrl}
        spotifyResult={typeof spotify === "string" ? spotify : undefined}
      />
      {!olderThan && <SeenBeacon />}
    </>
  );
}

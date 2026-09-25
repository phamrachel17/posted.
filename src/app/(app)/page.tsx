import { FEED_PAGE, getFeed, getJukebox, getStampBook, getUs } from "@/lib/data";
import { SeenBeacon } from "@/components/SeenBeacon";
import { TodayView } from "@/components/TodayView";

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  const { before, record, spotify } = await searchParams;
  const olderThan = typeof before === "string" && !Number.isNaN(Date.parse(before)) ? before : undefined;

  const [us, posts, jukebox, stampBook] = await Promise.all([
    getUs(),
    getFeed({ before: olderThan }),
    getJukebox(),
    getStampBook(),
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
        spotifyResult={typeof spotify === "string" ? spotify : undefined}
      />
      {!olderThan && <SeenBeacon />}
    </>
  );
}

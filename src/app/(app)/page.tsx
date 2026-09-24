import { FEED_PAGE, getFeed, getLatestLesson, getNotebooks, getUs } from "@/lib/data";
import { SeenBeacon } from "@/components/SeenBeacon";
import { TodayView } from "@/components/TodayView";

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  const { before, record } = await searchParams;
  const olderThan = typeof before === "string" && !Number.isNaN(Date.parse(before)) ? before : undefined;

  const [us, posts, notebooks, lesson] = await Promise.all([
    getUs(),
    getFeed({ before: olderThan }),
    getNotebooks(),
    getLatestLesson(),
  ]);
  if (!us) return null; // The layout redirects before this renders.

  const olderHref = posts.length === FEED_PAGE ? `/?before=${encodeURIComponent(posts[posts.length - 1].created_at)}` : null;

  return (
    <>
      <TodayView
        us={us}
        posts={posts}
        now={new Date()}
        notebooks={notebooks}
        lesson={lesson}
        olderHref={olderHref}
        older={Boolean(olderThan)}
        startRecording={record === "1"}
      />
      {!olderThan && <SeenBeacon />}
    </>
  );
}

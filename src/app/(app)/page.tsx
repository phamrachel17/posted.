import { FEED_PAGE, getBucketList, getFeed, getLatestLesson, getUs } from "@/lib/data";
import { SeenBeacon } from "@/components/SeenBeacon";
import { TodayView } from "@/components/TodayView";

export default async function TodayPage({ searchParams }: PageProps<"/">) {
  const { before, record } = await searchParams;
  const olderThan = typeof before === "string" && !Number.isNaN(Date.parse(before)) ? before : undefined;

  const [us, posts, lesson, bucketList] = await Promise.all([
    getUs(),
    getFeed({ before: olderThan }),
    getLatestLesson(),
    getBucketList(),
  ]);
  if (!us) return null; // The layout redirects before this renders.

  const doneItems = bucketList.items.filter((i) => i.done_at).sort((a, b) => b.done_at!.localeCompare(a.done_at!));
  const latest = doneItems[0];
  const bucket = bucketList.missing
    ? null
    : {
        done: doneItems.length,
        total: bucketList.items.length,
        latest: latest
          ? { body: latest.body, by: latest.done_by === us.me.id ? "you" : (us.partner?.display_name ?? "") }
          : null,
      };

  const olderHref = posts.length === FEED_PAGE ? `/?before=${encodeURIComponent(posts[posts.length - 1].created_at)}` : null;

  return (
    <>
      <TodayView
        us={us}
        posts={posts}
        now={new Date()}
        lesson={lesson}
        olderHref={olderHref}
        older={Boolean(olderThan)}
        startRecording={record === "1"}
        bucket={bucket}
      />
      {!olderThan && <SeenBeacon />}
    </>
  );
}

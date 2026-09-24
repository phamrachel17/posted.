import { dayHeading, dayKey, lastHereLabel, type DayHeading } from "./time";
import type { Post } from "./types";

export type FeedItem =
  | { type: "day"; key: string; heading: DayHeading }
  | { type: "post"; post: Post }
  | { type: "last-here"; label: string };

/**
 * Groups posts (newest first) by the viewer's calendar day and places the
 * "last here" line under the partner's newest posts.
 */
export function buildFeed(
  posts: Post[],
  opts: { viewerTz: string; lastSeenAt: string | null; partnerId: string | null; now: Date; headTodayGroup?: boolean },
): FeedItem[] {
  const { viewerTz, lastSeenAt, partnerId, now } = opts;
  const todayKey = dayKey(now, viewerTz);

  let dividerAt = -1;
  if (lastSeenAt && partnerId) {
    const seen = new Date(lastSeenAt).getTime();
    const firstOld = posts.findIndex((p) => new Date(p.created_at).getTime() <= seen);
    const newFromPartner = posts
      .slice(0, firstOld === -1 ? posts.length : firstOld)
      .some((p) => p.author_id === partnerId);
    if (firstOld > 0 && newFromPartner) dividerAt = firstOld;
  }

  const items: FeedItem[] = [];
  let currentKey = opts.headTodayGroup ? "" : todayKey;
  posts.forEach((post, i) => {
    const key = dayKey(new Date(post.created_at), viewerTz);
    // The divider goes above any day heading, so everything above it is new.
    if (i === dividerAt && lastSeenAt) items.push({ type: "last-here", label: lastHereLabel(lastSeenAt, viewerTz, now) });
    if (key !== currentKey) {
      items.push({ type: "day", key, heading: dayHeading(key, todayKey) });
      currentKey = key;
    }
    items.push({ type: "post", post });
  });
  return items;
}

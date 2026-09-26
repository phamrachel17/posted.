import Link from "next/link";
import { buildFeed } from "@/lib/feed";
import type { People } from "@/lib/people";
import type { Post } from "@/lib/types";
import { PostCard } from "./PostCard";
import { Removable } from "./Removable";

type Props = {
  posts: Post[];
  people: People;
  viewerTz: string;
  now: Date;
  lastSeenAt?: string | null;
  partnerId?: string | null;
  hideNotebook?: boolean;
  readOnly?: boolean;
  /** Link to the next page of older posts, when there is one. */
  olderHref?: string | null;
  /** Show a heading for today's group too (off on Today, where the page header is the date). */
  headTodayGroup?: boolean;
};

export function FeedList({ posts, people, viewerTz, now, lastSeenAt = null, partnerId = null, hideNotebook, readOnly, olderHref, headTodayGroup }: Props) {
  const items = buildFeed(posts, { viewerTz, lastSeenAt, partnerId, now, headTodayGroup });
  return (
    <>
      {items.map((item) => {
        if (item.type === "day") {
          return (
            <div className="day-group" key={`day-${item.key}`}>
              <h2>{item.heading.isToday ? "Today" : `${item.heading.weekday}, ${item.heading.date}`}</h2>
            </div>
          );
        }
        if (item.type === "last-here") {
          return (
            <div className="last-here" key="last-here" role="separator">
              <i />
              <span>{item.label}</span>
              <i />
            </div>
          );
        }
        return (
          <Removable key={item.post.id} id={item.post.id}>
          <PostCard
            post={item.post}
            people={people}
            viewerTz={viewerTz}
            now={now}
            hideNotebook={hideNotebook}
            readOnly={readOnly}
          />
          </Removable>
        );
      })}
      {olderHref && (
        <Link href={olderHref} className="older-link">
          Earlier days
        </Link>
      )}
    </>
  );
}

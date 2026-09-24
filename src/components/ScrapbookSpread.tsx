/* eslint-disable @next/next/no-img-element -- photos come from short-lived signed URLs */
import Link from "next/link";
import { weatherLabel } from "@/lib/day";
import { inkStyle, type Ink } from "@/lib/inks";
import { longDate } from "@/lib/time";
import { formatDuration } from "@/lib/duration";
import type { DayMeta, Post } from "@/lib/types";
import { Doodle } from "./Doodle";
import { ScrapRemove } from "./ScrapRemove";
import { ScrapTitle } from "./ScrapTitle";
import { VoicePlayer } from "./VoicePlayer";

type Who = { name: string; ink: Ink };

/** A small, stable tilt for each item, so the page looks placed by hand. */
function tilt(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 7) - 3) * 0.6;
}

function dateOf(post: Post) {
  return longDate(post.postmark.local.slice(0, 10));
}

function Item({ post, title, who, readOnly }: { post: Post; title: string | null; who?: Who; readOnly?: boolean }) {
  const style = { ...(who ? inkStyle(who.ink) : {}), "--tilt": `${tilt(post.id)}deg` } as React.CSSProperties;
  const byline = (
    <span className="scrap-by">
      {who?.name} · {dateOf(post)}
    </span>
  );

  if (post.photos.length && post.photos[0].url) {
    return (
      <figure className="scrap polaroid" style={style}>
        {!readOnly && <ScrapRemove postId={post.id} />}
        <Link href={`/p/${post.id}`}>
          <img src={post.photos[0].url} alt="" loading="lazy" />
        </Link>
        {post.photos.length > 1 && <span className="scrap-more">+{post.photos.length - 1}</span>}
        <figcaption>
          <ScrapTitle postId={post.id} title={title} />
          {post.body && <span className="scrap-caption">{post.body}</span>}
          {byline}
        </figcaption>
      </figure>
    );
  }

  if (post.audio) {
    return (
      <div className="scrap ticket" style={style}>
        {!readOnly && <ScrapRemove postId={post.id} />}
        <span className="ticket-head">Voice memo · {formatDuration(post.audio.duration_ms)}</span>
        <VoicePlayer id={post.audio.id} url={post.audio.url} durationMs={post.audio.duration_ms} peaks={post.audio.peaks} small />
        {post.body && <span className="scrap-caption">{post.body}</span>}
        <ScrapTitle postId={post.id} title={title} />
        {byline}
      </div>
    );
  }

  if (post.kind === "day") {
    const meta = post.meta as unknown as DayMeta;
    return (
      <div className="scrap weather-tile" style={style}>
        {!readOnly && <ScrapRemove postId={post.id} />}
        <Doodle name={`weather-${meta.weather}`} size={40} />
        <b>{weatherLabel(meta.weather)}</b>
        {meta.today && <span className="scrap-caption">{meta.today}</span>}
        <ScrapTitle postId={post.id} title={title} />
        {byline}
      </div>
    );
  }

  return (
    <div className="scrap paper-note" style={style}>
        {!readOnly && <ScrapRemove postId={post.id} />}
      <Link href={`/p/${post.id}`} className="scrap-text">{post.body}</Link>
      <ScrapTitle postId={post.id} title={title} />
      {byline}
    </div>
  );
}

/** One month's page: posts laid out as polaroids, ticket stubs, notes, and weather tiles. */
export function ScrapbookSpread({ items, people, label, readOnly }: { items: { id: string; title: string | null; post: Post }[]; people: Record<string, Who>; label: string; readOnly?: boolean }) {
  return (
    <section className="spread" aria-label={label}>
      {items.map((item) => (
        <Item key={item.id} post={item.post} title={item.title} who={people[item.post.author_id]} readOnly={readOnly} />
      ))}
    </section>
  );
}

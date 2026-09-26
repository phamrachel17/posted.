/* eslint-disable @next/next/no-img-element -- photos come from short-lived signed URLs */
import Link from "next/link";
import { inkStyle } from "@/lib/inks";
import type { People } from "@/lib/people";
import { longDate } from "@/lib/time";
import type { DayMeta, LessonMeta, Post } from "@/lib/types";
import { Avatar } from "./Avatar";
import { CardFooter } from "./CardFooter";
import { DayCard } from "./DayCard";
import { Doodle } from "./Doodle";
import { NotebookMark } from "./NotebookMark";
import { PostBody } from "./PostBody";
import { PostMenu } from "./PostMenu";
import { Postmark } from "./Postmark";
import { ReactionBar } from "./ReactionBar";
import { VoicePlayer } from "./VoicePlayer";

type Props = {
  post: Post;
  people: People;
  viewerTz: string;
  now: Date;
  /** Hide the notebook label (already inside that notebook). */
  hideNotebook?: boolean;
  /** On the post's own page: no "Write back" link or reply preview. */
  detail?: boolean;
  /** Design preview: nothing is interactive. */
  readOnly?: boolean;
  /** Just sent: the card lands on the wall and the postmark stamps it. */
  landing?: boolean;
};

function LessonBody({ meta, post }: { meta: LessonMeta; post: Post }) {
  const href = post.notebook ? `/n/${post.notebook.slug}/lessons/${meta.n}` : `/p/${post.id}`;
  return (
    <Link href={href} className="lesson-summary">
      <span className="label">Lesson {meta.n}</span>
      <b>{meta.date ? longDate(meta.date) : "No date yet"}</b>
      {meta.topics?.length > 0 && (
        <span className="chips">{meta.topics.map((t) => <span key={t} className="chip">{t}</span>)}</span>
      )}
      <span className="hint">
        {meta.vocab?.length ? `${meta.vocab.length} words · ` : ""}Open the lesson
      </span>
    </Link>
  );
}

export function PostCard({ post, people, viewerTz, hideNotebook, detail, readOnly, landing }: Props) {
  const author = people.byId[post.author_id];
  const isMine = post.author_id === people.meId;
  const isNew = Boolean(landing);
  const n = post.photos.length;
  const replier = post.latestReply ? people.byId[post.latestReply.author_id] : null;
  const canEdit = post.kind !== "lesson";
  const partnerId = Object.keys(people.byId).find((id) => id !== people.meId);
  // Writing back on your own post is just a note to the thread, not "to" anyone.
  const partnerName = partnerId && !isMine ? people.byId[partnerId].name : undefined;

  return (
    <article className={["card", detail && "card-detail", isNew && "is-landing"].filter(Boolean).join(" ")} style={author ? inkStyle(author.ink) : undefined}>
      <header className="author-line">
        {author && <Avatar name={author.name} ink={author.ink} url={author.avatarUrl} size={30} />}
        <b>{author?.name ?? "Someone"}</b>
        {post.kind === "day" && <span>· My day</span>}
        {post.kind === "day" && (post.meta as { added_at?: string }).added_at && <span>· added later</span>}
        {post.notebook && !hideNotebook && (
          <Link href={`/n/${post.notebook.slug}`} className="nb-label">
            · in <NotebookMark doodle={post.notebook.doodle} size={15} /> {post.notebook.name}
          </Link>
        )}
        {post.edited_at && post.kind !== "lesson" && <span>· edited</span>}
      </header>

      {post.kind === "day" && (
        <DayCard
          postId={post.id}
          meta={post.meta as unknown as DayMeta}
          authorId={post.author_id}
          date={post.postmark.local.slice(0, 10)}
          timeZone={author?.timezone ?? viewerTz}
        />
      )}
      {post.kind === "lesson" && <LessonBody meta={post.meta as unknown as LessonMeta} post={post} />}

      {n > 0 && (
        <div className={`photos n${Math.min(n, 6)}${post.notebook ? "" : " is-clipped"}`}>
          {/* A postcard's photos are held on with a paper clip. */}
          {!post.notebook && <img className="photo-clip" src="/textures/clip.svg" alt="" aria-hidden width={32} height={96} />}
          {post.photos.map((photo) =>
            photo.url ? (
              <a key={photo.id} href={photo.url} target="_blank" rel="noreferrer">
                <img src={photo.url} alt="" width={photo.width ?? undefined} height={photo.height ?? undefined} loading="lazy" />
              </a>
            ) : (
              <div key={photo.id} className="photo-missing">Photo unavailable</div>
            ),
          )}
        </div>
      )}

      {post.kind !== "day" && post.kind !== "lesson" && <PostBody postId={post.id} body={post.body} />}

      {post.audio && (
        <VoicePlayer id={post.audio.id} url={post.audio.url} durationMs={post.audio.duration_ms} peaks={post.audio.peaks} />
      )}

      {detail ? (
        <footer className="card-foot">
          <ReactionBar target={{ postId: post.id }} reactions={post.reactions} people={people} readOnly={readOnly} />
          {post.kept && <Doodle name="kept" size={16} className="kept-mark" label="Kept" />}
          {!readOnly && <PostMenu postId={post.id} isMine={isMine} kept={post.kept} canEdit={canEdit} leaveOnDelete />}
        </footer>
      ) : (
        <CardFooter
          postId={post.id}
          spaceId={people.spaceId}
          partnerName={partnerName}
          start={<ReactionBar target={{ postId: post.id }} reactions={post.reactions} people={people} readOnly={readOnly} />}
          end={
            <>
              {post.kept && <Doodle name="kept" size={16} className="kept-mark" label="Kept" />}
              {!readOnly && <PostMenu postId={post.id} isMine={isMine} kept={post.kept} canEdit={canEdit} />}
            </>
          }
        />
      )}

      {!detail && post.latestReply && replier && (
        <div className="reply-preview" style={inkStyle(replier.ink)}>
          <Link href={`/p/${post.id}`} className="reply-preview-link">
            <b>{post.latestReply.author_id === people.meId ? "You wrote back" : `${replier.name} wrote back`}</b>
            {post.latestReply.body === null && <span>{post.latestReply.hasAudio ? "A voice memo" : ""}</span>}
          </Link>
          {post.latestReply.body !== null && (
            <PostBody postId={post.latestReply.id} body={post.latestReply.body} kind="reply" className="reply-preview-text" embeds={false} />
          )}
          {post.latestReply.author_id === people.meId && !readOnly && (
            <PostMenu postId={post.latestReply.id} isMine kept={false} canEdit={post.latestReply.body !== null} kind="reply" />
          )}
        </div>
      )}

      <Postmark postmark={post.postmark} isNew={isNew} big={detail} stamp={post.stamp} />
    </article>
  );
}

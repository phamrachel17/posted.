import Link from "next/link";
import { notFound } from "next/navigation";
import { getPost, getUs } from "@/lib/data";
import { inkStyle } from "@/lib/inks";
import { peopleOf } from "@/lib/people";
import { exactTime, localStamp, spokenTime } from "@/lib/time";
import { Doodle } from "@/components/Doodle";
import { PostBody } from "@/components/PostBody";
import { PostCard } from "@/components/PostCard";
import { PostMenu } from "@/components/PostMenu";
import { ReactionBar } from "@/components/ReactionBar";
import { VoicePlayer } from "@/components/VoicePlayer";
import { WriteBack } from "@/components/WriteBack";

export default async function PostPage({ params }: PageProps<"/p/[id]">) {
  const { id } = await params;
  const [us, found] = await Promise.all([getUs(), getPost(id)]);
  if (!us) return null;
  if (!found) notFound();

  const { post, replies } = found;
  const people = peopleOf(us);
  const now = new Date();
  const back = post.notebook ? { href: `/n/${post.notebook.slug}`, label: post.notebook.name } : { href: "/", label: "Today" };

  return (
    <main className="main detail" style={inkStyle(us.me.ink)}>
      <Link href={back.href} className="back">
        <Doodle name="back" size={16} />
        {back.label}
      </Link>

      <PostCard post={post} people={people} viewerTz={us.me.timezone} now={now} detail hideNotebook={false} />

      {replies.length > 0 && (
        <ol className="margin-notes">
          {replies.map((reply) => {
            const who = people.byId[reply.author_id];
            const mine = reply.author_id === us.me.id;
            return (
              <li key={reply.id} className="note" style={who ? inkStyle(who.ink) : undefined}>
                <div className="author-line">
                  <b>{who?.name ?? "Someone"}</b>
                  <time dateTime={reply.created_at} title={exactTime(reply.created_at, us.me.timezone)}>
                    {spokenTime(reply.created_at, localStamp(new Date(reply.created_at), who?.timezone ?? us.me.timezone), us.me.timezone, now)}
                  </time>
                </div>
                <PostBody postId={reply.id} body={reply.body} kind="reply" className="post-body note-body" />
                {reply.audio && (
                  <VoicePlayer id={reply.audio.id} url={reply.audio.url} durationMs={reply.audio.duration_ms} peaks={reply.audio.peaks} small />
                )}
                <div className="card-foot">
                  <ReactionBar target={{ replyId: reply.id }} reactions={reply.reactions} people={people} />
                  {mine && <PostMenu postId={reply.id} isMine kept={false} canEdit={Boolean(reply.body)} kind="reply" />}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <WriteBack postId={post.id} spaceId={us.space.id} partnerName={us.partner?.display_name} />
    </main>
  );
}

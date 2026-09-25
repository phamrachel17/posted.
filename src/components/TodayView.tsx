import { inkStyle } from "@/lib/inks";
import { peopleOf } from "@/lib/people";
import type { BookStamp } from "@/lib/stamps";
import { dayHeading, dayKey } from "@/lib/time";
import type { Post, Us } from "@/lib/types";
import { Composer } from "./Composer";
import { Doodle } from "./Doodle";
import { FeedList } from "./FeedList";
import { RightRail, type JukeboxData } from "./RightRail";

type Props = {
  us: Us;
  posts: Post[];
  now: Date;
  olderHref?: string | null;
  jukebox?: JukeboxData | null;
  stampBook?: BookStamp[];
  /** How connecting Spotify went, when coming back from its sign-in. */
  spotifyResult?: string;
  /** Showing an older page: no composer, no "last here" line. */
  older?: boolean;
  startRecording?: boolean;
  preview?: boolean;
};

export function TodayView({ us, posts, now, olderHref, older, startRecording, preview, jukebox, stampBook, spotifyResult }: Props) {
  const { me, partner } = us;
  const todayKey = dayKey(now, me.timezone);
  const today = dayHeading(todayKey, todayKey);

  return (
    <>
      <main className="main" style={inkStyle(me.ink)}>
        <header className="day-front">
          <span className="weekday">{older ? "Earlier" : today.weekday}</span>
          <h1 className="date">{older ? "Before this" : today.date}</h1>
        </header>

        {!older && (
          <Composer
            spaceId={us.space.id}
            preview={preview}
            startRecording={startRecording}
            timeZone={me.timezone}
            stamps={{ book: stampBook ?? [], defaultStamp: me.stamp, people: peopleOf(us) }}
          />
        )}

        {posts.length === 0 && !older && (
          <div className="empty">
            <Doodle name="empty-today" size={110} height={131} />
            <b>Nothing here yet</b>
            <p>Leave the first thing. It doesn&rsquo;t have to be interesting. What you had for lunch is plenty.</p>
          </div>
        )}

        <FeedList
          posts={posts}
          people={peopleOf(us)}
          viewerTz={me.timezone}
          now={now}
          lastSeenAt={older ? null : me.last_seen_at}
          partnerId={partner?.id ?? null}
          readOnly={preview}
          olderHref={olderHref}
          headTodayGroup={older}
        />
      </main>
      <RightRail us={us} now={now} jukebox={jukebox} preview={preview} spotifyResult={spotifyResult} />
    </>
  );
}

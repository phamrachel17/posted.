import Link from "next/link";
import { inkStyle } from "@/lib/inks";
import { clockTime, daysUntil, longDate } from "@/lib/time";
import type { LessonSummary } from "@/lib/data";
import type { NotebookRef, Us } from "@/lib/types";
import { Doodle } from "./Doodle";
import { LiveClock } from "./LiveClock";
import { OnlineDot } from "./Presence";

type Props = { us: Us; now: Date; lesson: (LessonSummary & { notebook: NotebookRef }) | null };

export function RightRail({ us, now, lesson }: Props) {
  const { me, partner, space } = us;
  const days = space.next_visit_on ? daysUntil(space.next_visit_on, me.timezone, now) : null;
  const lessonDays = lesson ? daysUntil(lesson.meta.date, me.timezone, now) : null;
  const partnerQuestion = lesson?.meta.questions?.some((q) => q.by === partner?.id && !q.answered);

  return (
    <aside className="rail" aria-label="The two of you">
      <div className="rail-box">
        <span className="label">Right now</span>
        <div className="clock" style={inkStyle(me.ink)}>
          <span className="ink-dot" />
          <span>You · {me.city}</span>
          <LiveClock timeZone={me.timezone} initial={clockTime(me.timezone, now)} />
        </div>
        {partner && (
          <div className="clock" style={inkStyle(partner.ink)}>
            <span className="ink-dot" />
            <span className="clock-who">
              {partner.display_name} · {partner.city}
              <OnlineDot memberId={partner.id} label={partner.display_name} />
            </span>
            <LiveClock timeZone={partner.timezone} initial={clockTime(partner.timezone, now)} />
          </div>
        )}
      </div>

      {days !== null && days >= 0 && space.next_visit_on && (
        <div className="rail-box">
          <span className="label">Next time together</span>
          <div className="countdown">
            <Doodle name="stars" size={32} height={35} className="countdown-stars" />
            <b>{days === 0 ? "Today" : days}</b>
            <span>
              {days > 0 && <>{days === 1 ? "day" : "days"}<br /></>}
              {longDate(space.next_visit_on)}
              {space.next_visit_place ? ` · ${space.next_visit_place}` : ""}
            </span>
          </div>
        </div>
      )}

      {lesson && lessonDays !== null && lessonDays >= 0 && (
        <div className="rail-box">
          <span className="label">Sunday lesson</span>
          <Link href={`/n/${lesson.notebook.slug}/lessons/${lesson.meta.n}`} className="lesson-mini">
            <b>Lesson {lesson.meta.n}</b>
            <span className="hint">{longDate(lesson.meta.date)}</span>
            {partnerQuestion && partner && <span>{partner.display_name} added a question for Sunday.</span>}
          </Link>
        </div>
      )}
    </aside>
  );
}

import Link from "next/link";
import { inkStyle } from "@/lib/inks";
import { clockTime, daysUntil, longDate } from "@/lib/time";
import { conditions, distanceKm, formatDistance, formatTemp, geocode, usesImperial, type Conditions } from "@/lib/weather";
import type { LessonSummary } from "@/lib/data";
import type { Member, NotebookRef, Us } from "@/lib/types";
import { Doodle } from "./Doodle";
import { LiveClock } from "./LiveClock";
import { OnlineDot } from "./Presence";

export type BucketStat = { done: number; total: number; latest: { body: string; by: string } | null };

type Props = {
  us: Us;
  now: Date;
  lesson: (LessonSummary & { notebook: NotebookRef }) | null;
  bucket?: BucketStat | null;
};

function WeatherLine({ c, imperial }: { c: Conditions | null; imperial: boolean }) {
  if (!c) return null;
  return (
    <span className="weather-line">
      <Doodle name={`weather-${c.weather}`} size={16} />
      {formatTemp(c.tempC, imperial)} · {c.label}
    </span>
  );
}

function Clock({ m, label, now, weather, imperial, online }: { m: Member; label: string; now: Date; weather: Conditions | null; imperial: boolean; online?: boolean }) {
  return (
    <div className="clock-block" style={inkStyle(m.ink)}>
      <div className="clock">
        <span className="ink-dot" />
        <span className="clock-who">
          {label} · {m.city}
          {online && <OnlineDot memberId={m.id} label={m.display_name} />}
        </span>
        <LiveClock timeZone={m.timezone} initial={clockTime(m.timezone, now)} />
      </div>
      <WeatherLine c={weather} imperial={imperial} />
    </div>
  );
}

export async function RightRail({ us, now, lesson, bucket }: Props) {
  const { me, partner, space } = us;
  const imperial = usesImperial(me.timezone);
  const days = space.next_visit_on ? daysUntil(space.next_visit_on, me.timezone, now) : null;
  const lessonDays = lesson ? daysUntil(lesson.meta.date, me.timezone, now) : null;
  const partnerQuestion = lesson?.meta.questions?.some((q) => q.by === partner?.id && !q.answered);

  // Weather and distance; any of these can come back null and the rail simply leaves it out.
  const [myPlace, theirPlace] = await Promise.all([
    geocode(me.city, me.timezone),
    partner ? geocode(partner.city, partner.timezone) : Promise.resolve(null),
  ]);
  const [myWeather, theirWeather] = await Promise.all([
    myPlace ? conditions(myPlace) : Promise.resolve(null),
    theirPlace ? conditions(theirPlace) : Promise.resolve(null),
  ]);
  const km = myPlace && theirPlace ? distanceKm(myPlace, theirPlace) : null;

  return (
    <aside className="rail" aria-label="The two of you">
      <div className="rail-box">
        <span className="label">Right now</span>
        <Clock m={me} label="You" now={now} weather={myWeather} imperial={imperial} />
        {partner && <Clock m={partner} label={partner.display_name} now={now} weather={theirWeather} imperial={imperial} online />}
        {km !== null && (
          <span className="distance">{km < 25 ? "Together, or close to it" : `${formatDistance(km, imperial)} apart`}</span>
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

      {bucket && (
        <div className="rail-box">
          <span className="label">Bucket list</span>
          <Link href="/bucket-list" className="bucket-stat">
            {bucket.total === 0 ? (
              <span>Start a list of things to do together.</span>
            ) : (
              <>
                <span className="bucket-stat-num">
                  <b>{bucket.done}</b> of {bucket.total} done
                </span>
                <span className="bucket-bar" aria-hidden>
                  <i style={{ width: `${Math.round((bucket.done / bucket.total) * 100)}%` }} />
                </span>
                {bucket.latest && (
                  <span className="hint">
                    Latest: {bucket.latest.body} ({bucket.latest.by})
                  </span>
                )}
              </>
            )}
          </Link>
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

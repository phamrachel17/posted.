import { inkStyle } from "@/lib/inks";
import { clockTime, daysUntil, localStamp, longDate, spokenTime } from "@/lib/time";
import { conditions, distanceKm, formatDistance, formatTemp, geocode, usesImperial, type Conditions } from "@/lib/weather";
import type { Song } from "@/lib/data";
import type { Member, Us } from "@/lib/types";
import { Avatar } from "./Avatar";
import { Doodle } from "./Doodle";
import { Jukebox } from "./Jukebox";
import { spotifyStatus } from "@/lib/spotify-auth";
import { LiveClock } from "./LiveClock";
import { OnlineDot } from "./Presence";

export type JukeboxData = { current: Song | null; earlier: Song[] };

type Props = {
  us: Us;
  now: Date;
  jukebox?: JukeboxData | null;
  preview?: boolean;
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
        <Avatar name={m.display_name} ink={m.ink} url={m.avatar_url} size={30} />
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

export async function RightRail({ us, now, jukebox, preview }: Props) {
  const { me, partner, space } = us;
  const imperial = usesImperial(me.timezone);
  const days = space.next_visit_on ? daysUntil(space.next_visit_on, me.timezone, now) : null;

  // Weather and distance; any of these can come back null and the rail simply leaves it out.
  const spotify = preview ? undefined : await spotifyStatus();
  const [myPlace, theirPlace] = await Promise.all([
    geocode(me.city, me.timezone),
    partner ? geocode(partner.city, partner.timezone) : Promise.resolve(null),
  ]);
  const [myWeather, theirWeather] = await Promise.all([
    myPlace ? conditions(myPlace) : Promise.resolve(null),
    theirPlace ? conditions(theirPlace) : Promise.resolve(null),
  ]);
  const km = myPlace && theirPlace ? distanceKm(myPlace, theirPlace) : null;
  const names = Object.fromEntries([me, partner].filter(Boolean).map((m) => [m!.id, m!.display_name]));

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

      {jukebox && (
        <div className="rail-box">
          <span className="label">On the record player</span>
          <Jukebox
            current={jukebox.current}
            earlier={jukebox.earlier}
            names={names}
            meId={me.id}
            spaceId={space.id}
            when={
              jukebox.current
                ? spokenTime(jukebox.current.created_at, localStamp(new Date(jukebox.current.created_at), (jukebox.current.set_by === me.id ? me : partner ?? me).timezone), me.timezone, now)
                : null
            }
            preview={preview}
            spotify={spotify}
          />
        </div>
      )}

    </aside>
  );
}

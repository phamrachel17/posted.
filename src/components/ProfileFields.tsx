"use client";

import { useState, useSyncExternalStore } from "react";
import { CityField } from "./CityField";
import { INK_IDS, INKS, type Ink } from "@/lib/inks";

type Props = {
  defaults?: { display_name?: string; ink?: Ink; city?: string; timezone?: string };
  /** The partner's ink, which can't be picked twice. */
  takenInk?: Ink | null;
};

// useSyncExternalStore needs snapshots that return the same value every call,
// or React re-renders forever. The zone list is built once and reused.
const subscribe = () => () => {};
const browserZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
let zoneList: string[] | null = null;
const allZones = () => (zoneList ??= Intl.supportedValuesOf("timeZone"));
const NO_ZONES: string[] = [];
const noZones = () => NO_ZONES;

/** Name, ink, postmark city, and time zone. Shared by setup, invite, and settings. */
export function ProfileFields({ defaults = {}, takenInk }: Props) {
  const detected = useSyncExternalStore(subscribe, browserZone, () => "");
  const zones = useSyncExternalStore(subscribe, allZones, noZones);
  const [pickedZone, setPickedZone] = useState<string | null>(null);
  const timezone = pickedZone || defaults.timezone || detected;
  const options = timezone && zones.length && !zones.includes(timezone) ? [timezone, ...zones] : zones;
  const firstFree = INK_IDS.find((i) => i !== takenInk) ?? "blue";
  const ink = defaults.ink && defaults.ink !== takenInk ? defaults.ink : firstFree;

  return (
    <>
      <div className="field">
        <label className="label" htmlFor="display_name">Your name</label>
        <input id="display_name" name="display_name" type="text" required maxLength={40}
          defaultValue={defaults.display_name} autoComplete="given-name" />
      </div>

      <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="label" style={{ marginBottom: 10 }}>Your ink</legend>
        <div className="ink-picker">
          {INK_IDS.map((id) => (
            <label key={id} style={{ background: INKS[id].color }} title={id === takenInk ? `${INKS[id].label} (taken)` : INKS[id].label}>
              <input type="radio" name="ink" value={id} defaultChecked={id === ink} disabled={id === takenInk}
                aria-label={INKS[id].label} />
            </label>
          ))}
        </div>
        <span className="hint">Everything you post, react with, or check off is written in this color.</span>
      </fieldset>

      <div className="field">
        <label className="label" htmlFor="city">Postmark city</label>
        <CityField defaultCity={defaults.city} onPick={(c) => setPickedZone(c.timezone)} />
        <span className="hint">Stamped on everything you post, with your local time. Picking a city sets your time zone too.</span>
      </div>

      <div className="field">
        <label className="label" htmlFor="timezone">Time zone</label>
        {options.length ? (
          <select id="timezone" name="timezone" value={timezone} onChange={(e) => setPickedZone(e.target.value)} required>
            {options.map((z) => <option key={z} value={z}>{z.replaceAll("_", " ")}</option>)}
          </select>
        ) : (
          <input id="timezone" name="timezone" type="text" defaultValue={timezone} required />
        )}
      </div>
    </>
  );
}

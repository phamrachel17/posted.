"use client";

import { useState } from "react";
import { DAY_PROMPTS, MAX_DAY_NOTE, MOODS } from "@/lib/day";
import { dayKey } from "@/lib/time";
import type { DayMeta } from "@/lib/types";
import { Doodle } from "./Doodle";

export const MAX_DAYS_BACK = 60;

/** Today and the earliest allowed day, as "YYYY-MM-DD", in a time zone. */
export function dayBounds(timeZone: string) {
  const today = dayKey(new Date(), timeZone);
  const [y, m, d] = today.split("-").map(Number);
  const earliest = new Date(Date.UTC(y, m - 1, d - MAX_DAYS_BACK)).toISOString().slice(0, 10);
  const yesterday = new Date(Date.UTC(y, m - 1, d - 1)).toISOString().slice(0, 10);
  return { today, yesterday, earliest };
}

type Props = {
  value: Partial<DayMeta>;
  onChange: (next: Partial<DayMeta>) => void;
  date: string;
  onDate: (next: string) => void;
  timeZone: string;
};

/** Mood, energy, the three prompts, a note, and which day it's for. Used to post and to edit a My day. */
export function DayFields({ value, onChange, date, onDate, timeZone }: Props) {
  const [open, setOpen] = useState<string[]>(() => DAY_PROMPTS.filter((p) => value[p.key]).map((p) => p.key));
  const [noteOpen, setNoteOpen] = useState(() => Boolean(value.note));
  const { today, yesterday, earliest } = dayBounds(timeZone);

  return (
    <>
      <div className="day-date" role="group" aria-label="Which day">
        <button type="button" className="chip" aria-pressed={date === today} onClick={() => onDate(today)}>Today</button>
        <button type="button" className="chip" aria-pressed={date === yesterday} onClick={() => onDate(yesterday)}>Yesterday</button>
        <label className="day-date-pick">
          <span className="visually-hidden">Another day</span>
          <input type="date" value={date} min={earliest} max={today} onChange={(e) => e.target.value && onDate(e.target.value)} />
        </label>
      </div>

      <div className="weather-pick mood-pick" role="radiogroup" aria-label="Mood">
        {MOODS.map((m) => (
          <button
            key={m.id}
            type="button"
            role="radio"
            aria-checked={value.mood === m.id}
            aria-label={m.label}
            title={m.label}
            onClick={() => onChange({ ...value, mood: m.id })}
          >
            <Doodle name={`mood-${m.id}`} size={40} />
            <span className="mood-name">{m.label}</span>
          </button>
        ))}
      </div>

      <div className="energy-pick" role="radiogroup" aria-label="Energy">
        <span>Energy</span>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value.energy === n}
            aria-label={`${n} of 5`}
            className={value.energy && n <= value.energy ? "on" : undefined}
            onClick={() => onChange({ ...value, energy: value.energy === n ? undefined : n })}
          />
        ))}
      </div>

      {DAY_PROMPTS.filter((p) => open.includes(p.key)).map((p) => (
        <div className="field" key={p.key}>
          <label className="label" htmlFor={`day-${p.key}`}>{p.label}</label>
          <input
            id={`day-${p.key}`}
            type="text"
            maxLength={1000}
            autoFocus={!value[p.key]}
            value={(value[p.key] as string) ?? ""}
            onChange={(e) => onChange({ ...value, [p.key]: e.target.value })}
          />
        </div>
      ))}
      {noteOpen && (
        <div className="field">
          <label className="label" htmlFor="day-note">A note</label>
          <textarea
            id="day-note"
            rows={3}
            maxLength={MAX_DAY_NOTE}
            autoFocus={!value.note}
            placeholder="Anything else about the day"
            value={value.note ?? ""}
            onChange={(e) => onChange({ ...value, note: e.target.value })}
          />
        </div>
      )}
      {(DAY_PROMPTS.some((p) => !open.includes(p.key)) || !noteOpen) && (
        <div className="chips">
          {DAY_PROMPTS.filter((p) => !open.includes(p.key)).map((p) => (
            <button key={p.key} type="button" className="chip" onClick={() => setOpen((o) => [...o, p.key])}>
              + {p.label}
            </button>
          ))}
          {!noteOpen && (
            <button type="button" className="chip" onClick={() => setNoteOpen(true)}>
              + A note
            </button>
          )}
        </div>
      )}
    </>
  );
}

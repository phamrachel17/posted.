"use client";

import { useEffect, useId, useRef, useState } from "react";

export type CityChoice = { name: string; region: string; timezone: string };

type Result = { name: string; admin1?: string; country?: string; timezone: string; latitude: number; longitude: number; population?: number };

const plain = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/**
 * The postmark city, picked from real places as you type (Open-Meteo's place search,
 * the same one the weather uses). The form can't be sent with a city that wasn't
 * picked from the list, so every postmark, stamp, and forecast can find it.
 */
export function CityField({ defaultCity, onPick }: { defaultCity?: string; onPick?: (c: CityChoice) => void }) {
  const [text, setText] = useState(defaultCity ?? "");
  // A city is confirmed once it's picked from the list (or it's the one you already had).
  const [confirmed, setConfirmed] = useState(Boolean(defaultCity));
  const [results, setResults] = useState<Result[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Tell the browser the field isn't valid until a place is picked, so the form won't submit.
  useEffect(() => {
    input.current?.setCustomValidity(confirmed || !text.trim() ? "" : "Pick your city from the list.");
  }, [confirmed, text]);

  // Search as you type, a moment after you stop.
  useEffect(() => {
    const q = text.trim();
    if (confirmed || q.length < 2) return;
    const controller = new AbortController();
    const t = window.setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=10&language=en&format=json`, { signal: controller.signal });
        const data = (await res.json()) as { results?: Result[] };
        // Places whose name starts with what you typed come first, then bigger places.
        const typed = plain(q);
        const ranked = (data.results ?? []).slice().sort((a, b) => {
          const sa = plain(a.name).startsWith(typed) ? 1 : 0, sb = plain(b.name).startsWith(typed) ? 1 : 0;
          return sb - sa || (b.population ?? 0) - (a.population ?? 0);
        });
        setResults(ranked);
        setActive(0);
        setOpen(true);
      } catch {
        // Offline or aborted: leave the list as it was.
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      window.clearTimeout(t);
      controller.abort();
    };
  }, [text, confirmed]);

  function pick(r: Result) {
    setText(r.name);
    setConfirmed(true);
    setOpen(false);
    setResults([]);
    onPick?.({ name: r.name, region: [r.admin1, r.country].filter(Boolean).join(", "), timezone: r.timezone });
  }

  const shown = results.slice(0, 6);
  const showList = open && !confirmed && text.trim().length >= 2;

  return (
    <div className="city-field">
      <input
        ref={input}
        id="city"
        name="city"
        type="text"
        required
        maxLength={40}
        value={text}
        placeholder="Start typing your city"
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && shown[active] ? `${listId}-${active}` : undefined}
        onChange={(e) => {
          setText(e.target.value);
          setConfirmed(false);
        }}
        onFocus={() => results.length && setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onKeyDown={(e) => {
          if (!showList || !shown.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % shown.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + shown.length) % shown.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(shown[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
      />
      {showList && (
        <ul id={listId} className="city-list" role="listbox">
          {results.length === 0 ? (
            <li className="city-empty" role="presentation">{loading ? "Looking…" : "No places by that name. Try the nearest city."}</li>
          ) : (
            shown.map((r, i) => (
              <li
                key={`${r.name}-${r.latitude}-${r.longitude}`}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  pick(r);
                }}
                onMouseEnter={() => setActive(i)}
              >
                <b>{r.name}</b>
                <span>{[r.admin1, r.country].filter(Boolean).join(", ")}</span>
              </li>
            ))
          )}
        </ul>
      )}
      {!confirmed && text.trim().length >= 2 && !showList && <span className="hint city-warn">Pick your city from the list so the postmark and weather can find it.</span>}
    </div>
  );
}

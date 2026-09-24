import "server-only";
import type { Weather } from "./types";

// Weather and distance from Open-Meteo (free, no account). Cities are looked up
// once a week; conditions refresh every 30 minutes. Any failure just returns null.

type Place = { lat: number; lon: number };

const TIMEOUT = 3000;

export async function geocode(city: string, timeZone: string): Promise<Place | null> {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 7 }, signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { latitude: number; longitude: number; timezone: string }[] };
    // Several places share a name ("Brooklyn"); prefer the one in this person's time zone.
    const match = data.results?.find((r) => r.timezone === timeZone) ?? data.results?.[0];
    return match ? { lat: match.latitude, lon: match.longitude } : null;
  } catch {
    return null;
  }
}

export type Conditions = { tempC: number; weather: Weather; label: string; isDay: boolean };

/** WMO weather codes mapped onto the five drawn weathers. */
function describe(code: number): { weather: Weather; label: string } {
  if (code === 0) return { weather: "clear", label: "clear" };
  if (code === 1) return { weather: "bright-spells", label: "mostly clear" };
  if (code === 2) return { weather: "bright-spells", label: "partly cloudy" };
  if (code === 3) return { weather: "overcast", label: "overcast" };
  if (code === 45 || code === 48) return { weather: "overcast", label: "foggy" };
  if (code >= 51 && code <= 57) return { weather: "drizzle", label: "drizzle" };
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return { weather: "drizzle", label: "rain" };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { weather: "overcast", label: "snow" };
  if (code >= 95) return { weather: "stormy", label: "thunderstorms" };
  return { weather: "overcast", label: "cloudy" };
}

export async function conditions(place: Place): Promise<Conditions | null> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}&current=temperature_2m,weather_code,is_day&timezone=auto`;
    const res = await fetch(url, { next: { revalidate: 60 * 30 }, signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return null;
    const data = (await res.json()) as { current?: { temperature_2m: number; weather_code: number; is_day: number } };
    if (!data.current) return null;
    return { tempC: data.current.temperature_2m, isDay: data.current.is_day === 1, ...describe(data.current.weather_code) };
  } catch {
    return null;
  }
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: Place, b: Place) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

/** US time zones get °F and miles; everyone else °C and km. */
export function usesImperial(timeZone: string) {
  return /^America\/(New_York|Chicago|Denver|Phoenix|Los_Angeles|Anchorage|Detroit|Boise|Indiana|Kentucky|North_Dakota|Menominee|Juneau|Sitka|Yakutat|Nome|Metlakatla|Adak)/.test(timeZone) || timeZone === "Pacific/Honolulu";
}

export function formatTemp(tempC: number, imperial: boolean) {
  return imperial ? `${Math.round((tempC * 9) / 5 + 32)}°F` : `${Math.round(tempC)}°C`;
}

export function formatDistance(km: number, imperial: boolean) {
  const n = imperial ? km * 0.621371 : km;
  const rounded = n >= 100 ? Math.round(n / 10) * 10 : Math.round(n);
  return `${rounded.toLocaleString("en-US")} ${imperial ? "miles" : "km"}`;
}

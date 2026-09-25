import "server-only";

// A photo of a city for its stamp: the lead image of the city's Wikipedia article,
// usually its skyline or best-known sight. Looked up once and cached for a month.

const MONTH = 60 * 60 * 24 * 30;
const TIMEOUT = 4000;
// Articles about places describe themselves like this.
const PLACE = /\b(city|borough|town|village|neighbou?rhood|capital|municipality|commune|comune|metropolis|district|island|county seat|census-designated)\b/i;
// Lead images that wouldn't make a good stamp.
const NOT_A_VIEW = /\.svg|map|locator|location|flag|seal|coat[_ ]of[_ ]arms|logo|emblem|montage|collage/i;

const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

async function country(city: string, timeZone: string): Promise<string | null> {
  try {
    const res = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=10&language=en&format=json`, {
      next: { revalidate: MONTH },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { country?: string; timezone: string }[] };
    // Several places share a name ("Portland"); the one in this person's time zone is theirs.
    const match = data.results?.find((r) => r.timezone === timeZone) ?? data.results?.[0];
    return match?.country ?? null;
  } catch {
    return null;
  }
}

type WikiPage = { title: string; index: number; description?: string; pageimage?: string; thumbnail?: { source: string } };

/** A photo URL for `city`, or null if Wikipedia doesn't have a good one (then the stamp is lettered). */
export async function cityPhoto(city: string, timeZone: string): Promise<string | null> {
  const name = city.trim();
  if (!name) return null;
  try {
    const where = await country(name, timeZone);
    const url = new URL("https://en.wikipedia.org/w/api.php");
    url.search = new URLSearchParams({
      action: "query",
      format: "json",
      generator: "search",
      gsrsearch: [name, where].filter(Boolean).join(" "),
      gsrlimit: "6",
      prop: "pageimages|description",
      piprop: "thumbnail|name",
      pithumbsize: "600",
      pilicense: "any",
    }).toString();
    const res = await fetch(url, {
      headers: { "User-Agent": "posted. (a private app for two people)" },
      next: { revalidate: MONTH },
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { query?: { pages?: Record<string, WikiPage> } };
    const pages = Object.values(data.query?.pages ?? {}).sort((a, b) => a.index - b.index);
    const c = norm(name);
    const titled = (p: WikiPage) => {
      const t = norm(p.title);
      return t === c || t.startsWith(`${c},`) || t.startsWith(`${c} (`);
    };
    const usable = (p: WikiPage) => Boolean(p.thumbnail) && !NOT_A_VIEW.test(p.pageimage ?? "");
    // The article named after the city wins; otherwise the first article that's about a place.
    const pick = pages.find((p) => usable(p) && titled(p)) ?? pages.find((p) => usable(p) && PLACE.test(p.description ?? ""));
    return pick?.thumbnail?.source ?? null;
  } catch {
    return null;
  }
}

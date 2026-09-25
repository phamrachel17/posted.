import type { Ink } from "./inks";
import type { Member, Us } from "./types";

/** Serializable lookup of who's who, for client components. */
export type People = { meId: string; spaceId: string; byId: Record<string, Person> };
export type Person = { name: string; ink: Ink; timezone: string; avatarUrl: string | null };

export function peopleOf(us: Us): People {
  const byId: People["byId"] = {};
  for (const m of [us.me, us.partner].filter(Boolean) as Member[]) byId[m.id] = {
      name: m.display_name,
      ink: m.ink,
      timezone: m.timezone,
      avatarUrl: m.avatar_url ?? null,
    };
  return { meId: us.me.id, spaceId: us.space.id, byId };
}

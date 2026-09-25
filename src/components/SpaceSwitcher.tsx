import Link from "next/link";
import { switchSpace } from "@/app/actions/space";
import { inkStyle, type Ink } from "@/lib/inks";
import { Doodle } from "./Doodle";

export type SpaceChoice = { id: string; myName: string; myInk: Ink; partnerName: string | null; partnerInk: Ink | null; active: boolean };

/** Who's in a space, the way the sidebar names it: "Rachel & Arya". */
export function SpaceName({ s }: { s: SpaceChoice }) {
  return (
    <span className="space-name">
      <span className="ink-dot" style={inkStyle(s.myInk)} /> {s.myName}
      <span>&amp;</span>
      {s.partnerName && s.partnerInk ? (
        <><span className="ink-dot" style={inkStyle(s.partnerInk)} /> {s.partnerName}</>
      ) : (
        <span className="hint">waiting for someone</span>
      )}
    </span>
  );
}

/** Your other spaces, each one tap away, and a way to start another. */
export function SpaceList({ spaces }: { spaces: SpaceChoice[] }) {
  return (
    <div className="space-list">
      {spaces.map((s) =>
        s.active ? (
          <div key={s.id} className="space-row is-active" aria-current="true">
            <SpaceName s={s} />
            <span className="hint">open</span>
          </div>
        ) : (
          <form key={s.id} action={switchSpace}>
            <input type="hidden" name="space_id" value={s.id} />
            <button type="submit" className="space-row">
              <SpaceName s={s} />
              <span className="hint">switch</span>
            </button>
          </form>
        ),
      )}
      <Link href="/spaces/new" className="space-row space-new">
        <Doodle name="plus" size={14} /> Start another space
      </Link>
    </div>
  );
}

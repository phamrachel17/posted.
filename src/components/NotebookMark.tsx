import { isTextDoodle } from "@/lib/notebooks";
import { Doodle } from "./Doodle";

/** A notebook's doodle, or the emoji/letter chosen instead. */
export function NotebookMark({ doodle, size = 16 }: { doodle: string | null; size?: number }) {
  if (!doodle) return <Doodle name="nb-book" size={size} />;
  if (isTextDoodle(doodle)) {
    return (
      <span className="text-doodle" style={{ fontSize: size * 0.9, width: size, height: size }} aria-hidden>
        {doodle.slice(5)}
      </span>
    );
  }
  return <Doodle name={doodle} size={size} />;
}

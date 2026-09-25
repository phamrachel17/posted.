import { inkStyle, type Ink } from "@/lib/inks";
import { Doodle } from "./Doodle";

type Props = { name: string; ink: Ink; url?: string | null; icon?: string | null; size?: number; className?: string };

/** A person's picture, else their chosen drawing, else their initial, in a circle of their ink. */
export function Avatar({ name, ink, url, icon, size = 28, className }: Props) {
  const style = { ...inkStyle(ink), width: size, height: size, fontSize: Math.round(size * 0.46) };
  return (
    <span className={className ? `avatar ${className}` : "avatar"} style={style} aria-hidden>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed Supabase links change, so next/image can't cache them
        <img src={url} alt="" />
      ) : icon ? (
        <Doodle name={icon} size={Math.round(size * 0.66)} />
      ) : (
        name.trim().charAt(0).toUpperCase() || "?"
      )}
    </span>
  );
}

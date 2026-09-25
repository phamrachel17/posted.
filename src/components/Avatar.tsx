import { inkStyle, type Ink } from "@/lib/inks";

type Props = { name: string; ink: Ink; url?: string | null; size?: number; className?: string };

/** A person's picture, or their initial in a circle of their ink. */
export function Avatar({ name, ink, url, size = 28, className }: Props) {
  const style = { ...inkStyle(ink), width: size, height: size, fontSize: Math.round(size * 0.46) };
  return (
    <span className={className ? `avatar ${className}` : "avatar"} style={style} aria-hidden>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element -- signed Supabase links change, so next/image can't cache them
        <img src={url} alt="" />
      ) : (
        name.trim().charAt(0).toUpperCase() || "?"
      )}
    </span>
  );
}

import type { CSSProperties } from "react";
import { DRAWN } from "@/lib/drawn";

type Props = {
  name: string;
  /** Square size, or the width when `height` is also given. */
  size?: number;
  height?: number;
  /** Number of hand-drawn versions on disk, named `${name}-1` … `${name}-N`. */
  variants?: number;
  /** Picks a stable variant, e.g. a post id. */
  seed?: string;
  className?: string;
  label?: string;
};

function pick(seed: string, count: number) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  return (Math.abs(h) % count) + 1;
}

/**
 * A drawing from /public/doodles, colored with currentColor via a CSS mask.
 * Hand-drawn PNGs (listed in lib/drawn.ts) win over the placeholder SVGs.
 * This is the only place drawings plug into the app.
 */
export function Doodle({ name, size = 20, height, variants, seed = "", className, label }: Props) {
  const base = variants && variants > 1 ? `${name}-${pick(seed, variants)}` : name;
  const file = DRAWN.has(base) ? `${base}.png` : `${base}.svg`;
  const style = {
    "--doodle": `url(/doodles/${file})`,
    width: size,
    height: height ?? size,
  } as CSSProperties;

  return (
    <span
      className={className ? `doodle ${className}` : "doodle"}
      style={style}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    />
  );
}

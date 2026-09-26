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

// Placeholder doodles that were replaced by Rachel's drawings. Anything saved with an
// old name (a scrapbook sticker, a notebook's icon) shows the closest drawing instead.
const RETIRED: Record<string, string> = {
  "st-flower": "d-flower", "st-daisy": "d-flower", "st-plant": "d-sprig", "nb-leaf": "d-sprig",
  "st-butterfly": "d-butterfly", "st-balloon": "d-balloon", "st-house": "d-house",
  "st-heart-filled": "heart", "nb-heart": "heart", "st-sparkle": "d-swirls", "st-sparkles": "d-swirls",
  "nb-star": "d-swirls", "st-moon": "d-sleepy-face", "nb-sun": "d-sun", "st-rainbow": "d-sun",
  "st-notes": "nb-music", "nb-film": "nb-popcorn", "st-ticket": "nb-popcorn", "nb-pan": "nb-cooking",
  "st-coffee": "nb-cooking", "nb-book": "nb-reading", "nb-enye": "nb-language", "st-speech": "nb-language",
  "nb-thought": "d-cloud", "nb-plane": "d-cloud", "st-pin": "kept", "nb-camera": "d-house",
  "st-gift": "heart", "st-crown": "d-flower-cat", "st-arrow": "d-swirls",
  "st-envelope": "heart", "st-stamp": "heart", "st-tape": "d-swirls",
};

/** The file URL for a drawing: the hand-drawn PNG if there is one, else the SVG icon. */
export function doodleUrl(name: string) {
  const n = RETIRED[name] ?? name;
  return `/doodles/${DRAWN.has(n) ? `${n}.png` : `${n}.svg`}`;
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

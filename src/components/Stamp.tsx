import type { CSSProperties } from "react";
import type { StampView } from "@/lib/stamps";
import { doodleUrl } from "./Doodle";

type Props = { stamp: StampView; size?: "tiny" | "small" | "big" | "tray" | "album"; className?: string };

// A lettered city stamp picks its paper from the city's name, so each city keeps its color.
const LETTERED = [
  { paper: "#dce4f2", ink: "#2a4b8d" },
  { paper: "#e3ecdd", ink: "#2e6a50" },
  { paper: "#f4dcd6", ink: "#8b1e2b" },
  { paper: "#f5ebcb", ink: "#6b4a2b" },
  { paper: "#e6e0ef", ink: "#5b3a6e" },
  { paper: "#e0edee", ink: "#1f6e77" },
];
function lettered(city: string) {
  let h = 0;
  for (const ch of city) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return LETTERED[h % LETTERED.length];
}

/** Longest word in a city name, so its lettering can shrink to fit without breaking a word. */
function fit(city: string) {
  return { "--word": Math.max(4, ...city.split(/\s+/).map((w) => w.length)) } as CSSProperties;
}

/** A postage stamp with perforated edges: a design, a photo, or a city. */
export function Stamp({ stamp, size = "small", className }: Props) {
  const cls = ["pstamp", `pstamp-${size}`, className].filter(Boolean).join(" ");
  // A city's photo is printed in one ink, like an engraved stamp, in that city's color.
  if (stamp.kind === "city" && stamp.url) {
    const c = lettered(stamp.city);
    return (
      <span className={cls} aria-hidden>
        <span className="pstamp-face pstamp-print" style={{ "--print-ink": c.ink } as CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element -- a Wikipedia image */}
          <img src={stamp.url} alt="" />
          {size !== "tiny" && <span className="pstamp-city" style={fit(stamp.city)}>{stamp.city}</span>}
        </span>
      </span>
    );
  }
  if (stamp.kind === "photo") {
    return (
      <span className={cls} aria-hidden>
        <span className="pstamp-face">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase links */}
          {stamp.url && <img src={stamp.url} alt="" />}
        </span>
      </span>
    );
  }
  if (stamp.kind === "city") {
    const c = lettered(stamp.city);
    return (
      <span className={cls} aria-hidden>
        <span className="pstamp-face pstamp-lettered" style={{ background: c.paper, color: c.ink } as CSSProperties}>
          <span style={fit(stamp.city)}>{stamp.city}</span>
        </span>
      </span>
    );
  }
  const { design } = stamp;
  return (
    <span className={cls} aria-hidden>
      <span className="pstamp-face" style={{ background: design.paper, color: design.ink } as CSSProperties}>
        <span className="pstamp-art" style={{ "--doodle": `url(${doodleUrl(design.doodle)})` } as CSSProperties} />
      </span>
    </span>
  );
}

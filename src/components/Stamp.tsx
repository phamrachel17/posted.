import type { CSSProperties } from "react";
import type { StampView } from "@/lib/stamps";
import { doodleUrl } from "./Doodle";

type Props = { stamp: StampView; size?: "tiny" | "small" | "big" | "tray"; className?: string };

/** A postage stamp with perforated edges: one of the designs, or a photo. */
export function Stamp({ stamp, size = "small", className }: Props) {
  const cls = ["pstamp", `pstamp-${size}`, className].filter(Boolean).join(" ");
  if (stamp.kind === "photo") {
    return (
      <span className={cls} aria-hidden>
        <span className="pstamp-face">
          {/* eslint-disable-next-line @next/next/no-img-element -- signed Supabase links change, so next/image can't cache them */}
          {stamp.url && <img src={stamp.url} alt="" />}
        </span>
      </span>
    );
  }
  const { design } = stamp;
  return (
    <span className={cls} aria-hidden>
      <span className="pstamp-face" style={{ background: design.paper, color: design.ink } as CSSProperties}>
        <span className="pstamp-art" style={{ "--doodle": `url(${doodleUrl(design.doodle)})` } as CSSProperties} />
        <span className="pstamp-value">{design.value}</span>
      </span>
    </span>
  );
}

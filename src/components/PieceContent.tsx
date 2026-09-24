/* eslint-disable @next/next/no-img-element -- media comes from short-lived signed URLs */
import type { CSSProperties } from "react";
import type { Piece } from "@/lib/data";
import { INKS, isInk } from "@/lib/inks";
import { stickerAspect } from "@/lib/stickers";
import { doodleUrl } from "./Doodle";

/** Where a piece sits on its page. Everything is a percentage, so pages look the same at any size. */
export function pieceStyle(p: Pick<Piece, "x" | "y" | "w" | "rotation" | "z">): CSSProperties {
  return { left: `${p.x}%`, top: `${p.y}%`, width: `${p.w}%`, transform: `rotate(${p.rotation}deg)`, zIndex: p.z };
}

export function inkColor(color: string | null) {
  return color && isInk(color) ? INKS[color].color : "var(--ink)";
}

/** What a piece looks like: photo, looping video, GIF, sticker, or handwritten note. */
export function PieceContent({ piece, thumb, muted = true }: { piece: Piece; thumb?: boolean; muted?: boolean }) {
  switch (piece.kind) {
    case "photo":
    case "gif":
      return piece.url ? (
        <img className="piece-media" src={piece.url} alt="" draggable={false} loading={thumb ? "lazy" : undefined} />
      ) : (
        <div className="piece-missing">Photo unavailable</div>
      );
    case "video":
      return piece.url ? (
        thumb ? (
          <video className="piece-media" src={piece.url} muted playsInline preload="metadata" />
        ) : (
          <video className="piece-media" src={piece.url} autoPlay loop muted={muted} playsInline />
        )
      ) : (
        <div className="piece-missing">Video unavailable</div>
      );
    case "sticker":
      return (
        <span
          className="piece-sticker"
          style={{ "--doodle": `url(${doodleUrl(piece.sticker ?? "heart")})`, aspectRatio: stickerAspect(piece.sticker), color: inkColor(piece.color) } as CSSProperties}
          aria-hidden
        />
      );
    case "text":
      return (
        <p className="piece-text" style={{ color: inkColor(piece.color) }}>
          {piece.body}
        </p>
      );
  }
}

/** A read-only page, used for thumbnails. */
export function PageView({ pieces }: { pieces: Piece[] }) {
  return (
    <div className="page-canvas is-thumb">
      {pieces.map((p) => (
        <div key={p.id} className={`piece kind-${p.kind}`} style={pieceStyle(p)}>
          <PieceContent piece={p} thumb />
        </div>
      ))}
    </div>
  );
}

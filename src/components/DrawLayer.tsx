"use client";

import { useCallback, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";

// Drawing on a scrapbook page. The page is 1000 × 750 units (it's always 4:3), so a
// drawing keeps its place and shape at any screen size.

const W = 1000;
const H = 750;
export const PEN_SIZES = [
  { id: "fine", label: "Fine", s: 3 },
  { id: "medium", label: "Medium", s: 6 },
  { id: "bold", label: "Bold", s: 12 },
] as const;

type Stroke = { s: number; pts: [number, number][] };

/** A smooth path through the points: curves through the midpoints, like a pen. */
function toPath(pts: [number, number][], dx = 0, dy = 0) {
  const r = (n: number) => Math.round(n * 10) / 10;
  const p = pts.map(([x, y]) => [r(x - dx), r(y - dy)] as const);
  if (p.length === 1) return `M${p[0][0]} ${p[0][1]} L${p[0][0] + 0.1} ${p[0][1]}`;
  let d = `M${p[0][0]} ${p[0][1]}`;
  for (let i = 1; i < p.length - 1; i++) {
    const mx = r((p[i][0] + p[i + 1][0]) / 2), my = r((p[i][1] + p[i + 1][1]) / 2);
    d += ` Q${p[i][0]} ${p[i][1]} ${mx} ${my}`;
  }
  const last = p[p.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

/** What gets saved: the strokes in their own box, and where that box sits on the page (in %). */
export type Drawing = { strokes: string; width: number; height: number; x: number; y: number; w: number };

export function useDrawing() {
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [size, setSize] = useState<number>(PEN_SIZES[1].s);

  const undo = useCallback(() => setStrokes((list) => list.slice(0, -1)), []);
  const clear = useCallback(() => setStrokes([]), []);

  const result = useCallback((): Drawing | null => {
    const pts = strokes.flatMap((s) => s.pts);
    if (!pts.length) return null;
    const pad = Math.max(...strokes.map((s) => s.s)) / 2 + 2;
    const minX = Math.min(...pts.map((p) => p[0])) - pad, maxX = Math.max(...pts.map((p) => p[0])) + pad;
    const minY = Math.min(...pts.map((p) => p[1])) - pad, maxY = Math.max(...pts.map((p) => p[1])) + pad;
    const width = Math.max(10, Math.ceil(maxX - minX)), height = Math.max(10, Math.ceil(maxY - minY));
    return {
      strokes: JSON.stringify(strokes.map((s) => ({ s: s.s, d: toPath(s.pts, minX, minY) }))),
      width,
      height,
      x: (minX / W) * 100,
      y: (minY / H) * 100,
      w: (width / W) * 100,
    };
  }, [strokes]);

  return { strokes, setStrokes, size, setSize, undo, clear, result };
}

type DrawingState = ReturnType<typeof useDrawing>;

/** The see-through layer over the page that you draw on. */
export function DrawOverlay({ drawing, color, canvasRef }: { drawing: DrawingState; color: string; canvasRef: RefObject<HTMLDivElement | null> }) {
  const { strokes, setStrokes, size } = drawing;
  const [live, setLive] = useState<Stroke | null>(null);

  const point = (e: ReactPointerEvent): [number, number] => {
    const r = canvasRef.current!.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * W, ((e.clientY - r.top) / r.height) * H];
  };

  return (
    <svg
      className="draw-layer"
      viewBox={`0 0 ${W} ${H}`}
      style={{ color }}
      onPointerDown={(e) => {
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        setLive({ s: size, pts: [point(e)] });
      }}
      onPointerMove={(e) => {
        if (!live) return;
        const p = point(e);
        setLive((cur) => {
          if (!cur) return cur;
          const last = cur.pts[cur.pts.length - 1];
          // Skip tiny moves so strokes stay light and smooth.
          if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.5) return cur;
          return { ...cur, pts: [...cur.pts, p] };
        });
      }}
      onPointerUp={() => {
        if (live) setStrokes((list) => [...list, live]);
        setLive(null);
      }}
      onPointerCancel={() => setLive(null)}
      aria-label="Drawing area"
    >
      {strokes.map((s, i) => (
        <path key={i} d={toPath(s.pts)} strokeWidth={s.s} />
      ))}
      {live && <path d={toPath(live.pts)} strokeWidth={live.s} />}
    </svg>
  );
}

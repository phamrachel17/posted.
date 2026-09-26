"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { addPiece, deletePiece, deleteScrapPage, renameScrapPage, updatePiece, type NewPiece } from "@/app/actions/scrapbook";
import type { Piece } from "@/lib/data";
import { PhotoError } from "@/lib/images";
import { INK_IDS, INKS, type Ink } from "@/lib/inks";
import { STICKER_GROUPS } from "@/lib/stickers";
import { uploadGif, uploadPhoto, uploadVideo } from "@/lib/upload";
import { Doodle, doodleUrl } from "./Doodle";
import { PieceContent, pieceStyle } from "./PieceContent";
import { DrawOverlay, PEN_SIZES, useDrawing } from "./DrawLayer";

type Props = {
  page: { id: string; title: string };
  initialPieces: Piece[];
  spaceId: string;
  meId: string;
  myInk: Ink;
};

type Drag = {
  id: string;
  mode: "move" | "resize" | "rotate";
  startX: number;
  startY: number;
  orig: Piece;
  rect: DOMRect;
  center?: { x: number; y: number };
};

const jitter = (n: number) => (Math.random() - 0.5) * n;

/** A free-form scrapbook page. Drag to move, pull the corner to resize, the top dot to turn. */
export function ScrapbookEditor({ page, initialPieces, spaceId, meId, myInk }: Props) {
  const [pieces, setPieces] = useState<Piece[]>(initialPieces);
  const [selected, setSelected] = useState<string | null>(null);
  const [title, setTitle] = useState(page.title);
  const [tray, setTray] = useState<"none" | "stickers" | "caption">("none");
  const [caption, setCaption] = useState("");
  const [editingText, setEditingText] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<{ title: string; detail?: string } | null>(null);
  const [soundOn, setSoundOn] = useState<string | null>(null);
  // Drawing on the page: while it's on, the page takes strokes instead of moving pieces.
  const [drawing, setDrawing] = useState(false);
  const [drawInk, setDrawInk] = useState<Ink>(myInk);
  const draw = useDrawing();
  const [, startTransition] = useTransition();
  const canvasRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drag = useRef<Drag | null>(null);

  const sel = pieces.find((p) => p.id === selected) ?? null;
  const topZ = () => pieces.reduce((m, p) => Math.max(m, p.z), 0) + 1;

  function patchLocal(id: string, patch: Partial<Piece>) {
    setPieces((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function save(id: string, patch: Parameters<typeof updatePiece>[2]) {
    startTransition(async () => {
      const r = await updatePiece(page.id, id, patch);
      if (r.error) setError({ title: r.error });
    });
  }

  async function add(piece: NewPiece, local: Partial<Piece> = {}) {
    const r = await addPiece(page.id, piece);
    if (r.error || !r.id) {
      setError({ title: r.error ?? "That didn't get added. Try again." });
      return;
    }
    const full: Piece = {
      id: r.id,
      kind: piece.kind,
      url: null,
      width: piece.width ?? null,
      height: piece.height ?? null,
      duration_ms: piece.duration_ms ?? null,
      sticker: piece.sticker ?? null,
      body: piece.body ?? null,
      color: piece.color ?? null,
      x: piece.x,
      y: piece.y,
      w: piece.w,
      rotation: piece.rotation,
      z: piece.z,
      created_by: meId,
      ...local,
    };
    setPieces((list) => [...list, full]);
    setSelected(r.id);
  }

  function placement(w: number): Pick<NewPiece, "x" | "y" | "w" | "rotation" | "z"> {
    return { x: 50 - w / 2 + jitter(20), y: 15 + jitter(20), w, rotation: Math.round(jitter(8)), z: topZ() };
  }

  async function onFiles(files: FileList | null) {
    if (!files) return;
    setError(null);
    for (const file of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        const preview = URL.createObjectURL(file);
        if (file.type.startsWith("video/") || /\.(mov|mp4|webm|m4v)$/i.test(file.name)) {
          const v = await uploadVideo(spaceId, file);
          await add({ kind: "video", ...v, ...placement(34) }, { url: preview });
        } else if (file.type === "image/gif") {
          const g = await uploadGif(spaceId, file);
          await add({ kind: "gif", ...g, ...placement(28) }, { url: preview });
        } else {
          const p = await uploadPhoto(spaceId, file);
          await add({ kind: "photo", path: p.path, mime: p.mime, width: p.width, height: p.height, ...placement(30) }, { url: preview });
        }
      } catch (err) {
        setError(err instanceof PhotoError ? { title: err.message, detail: err.detail } : { title: `${file.name} didn't upload. Try again.` });
      } finally {
        setUploading((n) => n - 1);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function remove(id: string) {
    setPieces((list) => list.filter((p) => p.id !== id));
    setSelected(null);
    startTransition(async () => {
      await deletePiece(page.id, id);
    });
  }

  // Editing a note's words. Finishing always saves, however it happens
  // (clicking elsewhere, Enter, or Done); Escape cancels.
  function startEditing(id: string) {
    const piece = pieces.find((p) => p.id === id);
    if (!piece) return;
    setSelected(id);
    setNoteDraft(piece.body ?? "");
    setEditingText(id);
  }

  function finishEditing(keep = true) {
    const id = editingText;
    if (!id) return;
    setEditingText(null);
    if (!keep) return;
    const piece = pieces.find((p) => p.id === id);
    const body = noteDraft.trim();
    if (!piece) return;
    if (!body) return remove(id);
    if (body !== piece.body) {
      patchLocal(id, { body });
      save(id, { body });
    }
  }

  // Dragging, resizing, turning.
  function begin(e: React.PointerEvent, id: string, mode: Drag["mode"]) {
    e.stopPropagation();
    if (editingText === id) return;
    if (editingText) finishEditing();
    const piece = pieces.find((p) => p.id === id);
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!piece || !rect) return;
    setSelected(id);
    let center;
    if (mode === "rotate") {
      const el = (e.currentTarget as HTMLElement).closest(".piece")!.getBoundingClientRect();
      center = { x: el.left + el.width / 2, y: el.top + el.height / 2 };
    }
    drag.current = { id, mode, startX: e.clientX, startY: e.clientY, orig: piece, rect, center };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }

  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const dx = ((e.clientX - d.startX) / d.rect.width) * 100;
    const dy = ((e.clientY - d.startY) / d.rect.height) * 100;
    if (d.mode === "move") patchLocal(d.id, { x: d.orig.x + dx, y: d.orig.y + dy });
    if (d.mode === "resize") patchLocal(d.id, { w: Math.max(5, Math.min(100, d.orig.w + dx)) });
    if (d.mode === "rotate" && d.center) {
      const angle = (Math.atan2(e.clientY - d.center.y, e.clientX - d.center.x) * 180) / Math.PI + 90;
      const snapped = Math.abs(angle) < 3 ? 0 : angle;
      patchLocal(d.id, { rotation: Math.round(((snapped + 540) % 360) - 180) });
    }
  }

  function end() {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    const now = pieces.find((p) => p.id === d.id);
    if (!now) return;
    if (d.mode === "move" && (now.x !== d.orig.x || now.y !== d.orig.y)) save(d.id, { x: now.x, y: now.y });
    if (d.mode === "resize" && now.w !== d.orig.w) save(d.id, { w: now.w });
    if (d.mode === "rotate" && now.rotation !== d.orig.rotation) save(d.id, { rotation: now.rotation });
  }

  // Arrow keys nudge; Delete removes.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selected || editingText) return;
      if ((e.target as HTMLElement).closest("input, textarea")) return;
      const p = pieces.find((x) => x.id === selected);
      if (!p) return;
      const step = e.shiftKey ? 2 : 0.5;
      const moves: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
      if (moves[e.key]) {
        e.preventDefault();
        const [dx, dy] = moves[e.key];
        patchLocal(p.id, { x: p.x + dx, y: p.y + dy });
        save(p.id, { x: p.x + dx, y: p.y + dy });
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        remove(p.id);
      } else if (e.key === "Escape") {
        setSelected(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const tilt = (by: number) => {
    if (!sel) return;
    const rotation = Math.max(-180, Math.min(180, sel.rotation + by));
    patchLocal(sel.id, { rotation });
    save(sel.id, { rotation });
  };

  return (
    <div className="editor">
      <div className="editor-head">
        <input
          className="editor-title"
          value={title}
          maxLength={80}
          aria-label="Page title"
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => title !== page.title && startTransition(async () => void (await renameScrapPage(page.id, title)))}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        <details className="nb-menu">
          <summary aria-label="Page options">
            <Doodle name="more" size={20} />
          </summary>
          <div className="post-menu-panel">
            <form action={deleteScrapPage} className="menu-confirm">
              <input type="hidden" name="id" value={page.id} />
              <span>Delete this page and everything on it? This can&rsquo;t be undone.</span>
              <button type="submit" className="btn btn-danger">Delete page</button>
            </form>
          </div>
        </details>
      </div>

      {drawing ? (
        <div className="editor-bar draw-bar" role="toolbar" aria-label="Drawing">
          <span className="draw-sizes" role="radiogroup" aria-label="Pen">
            {PEN_SIZES.map((p) => (
              <button key={p.id} type="button" role="radio" aria-checked={draw.size === p.s} aria-label={p.label} title={p.label} onClick={() => draw.setSize(p.s)}>
                <i style={{ width: p.s + 3, height: p.s + 3, background: INKS[drawInk].color }} />
              </button>
            ))}
          </span>
          <span className="ink-choices" role="group" aria-label="Ink">
            {INK_IDS.map((ink) => (
              <button key={ink} type="button" aria-label={INKS[ink].label} aria-pressed={drawInk === ink} style={{ background: INKS[ink].color }} onClick={() => setDrawInk(ink)} />
            ))}
          </span>
          <button type="button" className="b-tool" onClick={draw.undo} disabled={!draw.strokes.length}>Undo</button>
          <span className="draw-actions">
            <button
              type="button"
              className="b-tool"
              onClick={() => {
                draw.clear();
                setDrawing(false);
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const r = draw.result();
                draw.clear();
                setDrawing(false);
                if (r) add({ kind: "drawing", strokes: r.strokes, width: r.width, height: r.height, color: drawInk, x: r.x, y: r.y, w: r.w, rotation: 0, z: topZ() }, { strokes: r.strokes });
              }}
            >
              Done
            </button>
          </span>
        </div>
      ) : (
      <div className="editor-bar" role="toolbar" aria-label="Add to the page">
        <button
          type="button"
          className="b-tool"
          onClick={() => {
            if (editingText) finishEditing();
            setSelected(null);
            setTray("none");
            setDrawing(true);
          }}
        >
          <Doodle name="pen" size={18} /> Draw
        </button>
        <button type="button" className="b-tool" onClick={() => fileRef.current?.click()}>
          <Doodle name="camera" size={18} /> Photo, video, or GIF
        </button>
        <input ref={fileRef} type="file" hidden multiple accept="image/*,video/*,.heic,.heif,.gif,.mov" onChange={(e) => onFiles(e.target.files)} />
        <button type="button" className="b-tool" aria-expanded={tray === "stickers"} onClick={() => setTray(tray === "stickers" ? "none" : "stickers")}>
          <Doodle name="heart" size={18} /> Sticker
        </button>
        <button type="button" className="b-tool" aria-expanded={tray === "caption"} onClick={() => setTray(tray === "caption" ? "none" : "caption")}>
          <Doodle name="pen" size={18} /> Note
        </button>
        {uploading > 0 && <span className="hint">Uploading{uploading > 1 ? ` ${uploading} files` : ""}…</span>}
      </div>
      )}

      {tray === "stickers" && (
        <div className="sticker-tray">
          {STICKER_GROUPS.map((group) => (
            <section key={group.title} className="sticker-group" aria-label={group.title}>
              <h3 className="label">{group.title}</h3>
              <div className="sticker-grid">
                {group.stickers.map((s) => (
                  <button
                    key={s.name}
                    type="button"
                    title={s.label}
                    aria-label={`Add ${s.label}`}
                    onClick={() => {
                      setTray("none");
                      add({ kind: "sticker", sticker: s.name, color: myInk, ...placement(s.aspect > 2 ? 26 : s.aspect > 1.1 ? 22 : 13) });
                    }}
                  >
                    <span className="piece-sticker" style={{ "--doodle": `url(${doodleUrl(s.name)})`, aspectRatio: s.aspect } as React.CSSProperties} />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {tray === "caption" && (
        <form
          className="caption-tray"
          onSubmit={(e) => {
            e.preventDefault();
            if (!caption.trim()) return;
            add({ kind: "text", body: caption.trim(), color: myInk, ...placement(30) });
            setCaption("");
            setTray("none");
          }}
        >
          <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={300} placeholder="Write something…" autoFocus aria-label="Note" />
          <button type="submit" className="btn btn-primary" disabled={!caption.trim()}>Add</button>
        </form>
      )}

      {error && (
        <p className="error-note" role="alert">
          <b>{error.title}</b>
          {error.detail && <span>{error.detail}</span>}
        </p>
      )}

      <div className="canvas-wrap">
        <div
          ref={canvasRef}
          className={drawing ? "page-canvas is-drawing" : "page-canvas"}
          onPointerDown={() => {
            if (editingText) finishEditing();
            setSelected(null);
          }}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
        >
          {pieces.length === 0 && (
            <p className="canvas-empty">
              Add photos, short videos, GIFs, stickers, notes, or a drawing, then drag them wherever you like.
            </p>
          )}
          {pieces.map((p) => (
            <div
              key={p.id}
              className={`piece kind-${p.kind}${p.id === selected ? " is-selected" : ""}`}
              style={pieceStyle(p)}
              onPointerDown={(e) => begin(e, p.id, "move")}
              onDoubleClick={() => p.kind === "text" && startEditing(p.id)}
            >
              {editingText === p.id ? (
                <textarea
                  className="piece-text piece-text-edit"
                  value={noteDraft}
                  onChange={(e) => setNoteDraft(e.target.value)}
                  autoFocus
                  maxLength={300}
                  aria-label="Edit note"
                  onFocus={(e) => e.currentTarget.setSelectionRange(e.currentTarget.value.length, e.currentTarget.value.length)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      finishEditing();
                    } else if (e.key === "Escape") {
                      finishEditing(false);
                    }
                  }}
                />
              ) : (
                <PieceContent piece={p} muted={soundOn !== p.id} />
              )}
              {p.id === selected && !editingText && !drawing && (
                <>
                  <span className="h-rotate" aria-hidden onPointerDown={(e) => begin(e, p.id, "rotate")} />
                  <span className="h-resize" aria-hidden onPointerDown={(e) => begin(e, p.id, "resize")} />
                </>
              )}
            </div>
          ))}
          {drawing && <DrawOverlay drawing={draw} color={INKS[drawInk].color} canvasRef={canvasRef} />}
        </div>
      </div>

      {sel && (
        <div className="piece-bar" role="toolbar" aria-label="Selected item">
          <button type="button" className="b-tool" onClick={() => tilt(-5)}>↺ Tilt</button>
          <button type="button" className="b-tool" onClick={() => tilt(5)}>Tilt ↻</button>
          <button
            type="button"
            className="b-tool"
            onClick={() => {
              const z = topZ();
              patchLocal(sel.id, { z });
              save(sel.id, { z });
            }}
          >
            Bring to front
          </button>
          {sel.kind === "text" &&
            (editingText === sel.id ? (
              <button type="button" className="b-tool" onClick={() => finishEditing()}>Done</button>
            ) : (
              <button type="button" className="b-tool" onClick={() => startEditing(sel.id)}>Edit words</button>
            ))}
          {sel.kind === "video" && (
            <button type="button" className="b-tool" onClick={() => setSoundOn(soundOn === sel.id ? null : sel.id)}>
              {soundOn === sel.id ? "Sound off" : "Sound on"}
            </button>
          )}
          {(sel.kind === "text" || sel.kind === "sticker" || sel.kind === "drawing") && (
            <span className="ink-choices" role="group" aria-label="Color">
              {INK_IDS.map((ink) => (
                <button
                  key={ink}
                  type="button"
                  aria-label={INKS[ink].label}
                  aria-pressed={sel.color === ink}
                  style={{ background: INKS[ink].color }}
                  onClick={() => {
                    patchLocal(sel.id, { color: ink });
                    save(sel.id, { color: ink });
                  }}
                />
              ))}
            </span>
          )}
          <button type="button" className="b-tool danger" onClick={() => remove(sel.id)}>
            <Doodle name="trash" size={16} /> Remove
          </button>
        </div>
      )}
      <p className="hint">
        Drag to move. Pull the corner dot to resize and the top dot to turn. Double-click a note to change its words. Draw to doodle anywhere on the page. Changes save as you go.
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";

// Click-and-drag reordering for a list or grid. A mouse drag starts after the
// pointer moves a few pixels, so a plain click still follows the link. On touch,
// press and hold briefly first, so scrolling still works.

const MOUSE_SLOP = 6;
const GLIDE_MS = 180;

/** The box that actually draws an item (a display: contents wrapper has none of its own). */
function boxOf(el: HTMLElement): HTMLElement {
  return getComputedStyle(el).display === "contents" && el.firstElementChild ? (el.firstElementChild as HTMLElement) : el;
}
const TOUCH_HOLD_MS = 350;

type Drag = { id: string; x: number; y: number; pointerType: string; active: boolean; timer: number | null; moved: boolean };

export function useDragSort(ids: string[], onCommit: (ids: string[]) => void) {
  const key = ids.join(",");
  const [state, setState] = useState({ key, order: ids });
  // New ids from the server (someone added, removed, or reordered): start from those.
  if (state.key !== key) setState({ key, order: ids });
  const order = state.key === key ? state.order : ids;

  const [dragging, setDragging] = useState<string | null>(null);
  const drag = useRef<Drag | null>(null);
  const orderRef = useRef(order);
  useEffect(() => {
    orderRef.current = order;
  }, [order]);
  const suppressClick = useRef(false);
  // Where each item was just before a reorder, so they can glide to their new places.
  const before = useRef<Map<string, DOMRect> | null>(null);
  const listRef = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const was = before.current;
    const list = listRef.current;
    before.current = null;
    if (!was || !list || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    list.querySelectorAll<HTMLElement>("[data-sort-id]").forEach((el) => {
      const from = was.get(el.dataset.sortId!);
      if (!from) return;
      const box = boxOf(el);
      const to = box.getBoundingClientRect();
      const dx = from.left - to.left, dy = from.top - to.top;
      if (!dx && !dy) return;
      box.animate([{ translate: `${dx}px ${dy}px` }, { translate: "0 0" }], { duration: GLIDE_MS, easing: "cubic-bezier(0.2, 0.8, 0.3, 1)" });
    });
  }, [order]);

  const activate = useCallback(() => {
    const d = drag.current;
    if (!d || d.active) return;
    d.active = true;
    setDragging(d.id);
  }, []);

  const finish = useCallback(() => {
    const d = drag.current;
    drag.current = null;
    if (d?.timer) window.clearTimeout(d.timer);
    if (d?.active) {
      setDragging(null);
      suppressClick.current = true;
      window.setTimeout(() => (suppressClick.current = false), 0);
      const next = orderRef.current;
      if (next.join(",") !== key) onCommit(next);
    }
  }, [key, onCommit]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const d = drag.current;
      if (!d) return;
      const dist = Math.hypot(e.clientX - d.x, e.clientY - d.y);
      if (!d.active) {
        if (d.pointerType === "mouse" && dist > MOUSE_SLOP) activate();
        else if (d.pointerType !== "mouse" && dist > 8) {
          // Moved before the hold finished: it's a scroll, not a drag.
          if (d.timer) window.clearTimeout(d.timer);
          drag.current = null;
        }
        if (!drag.current?.active) return;
      }
      e.preventDefault();
      const over = (document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null)?.closest<HTMLElement>("[data-sort-id]");
      const overId = over?.dataset.sortId;
      if (!overId || overId === d.id) return;
      // Remember where everything is now, so the reorder can glide instead of jump.
      const list = over?.closest<HTMLElement>(".sortable") ?? null;
      if (list) {
        listRef.current = list;
        const rects = new Map<string, DOMRect>();
        list.querySelectorAll<HTMLElement>("[data-sort-id]").forEach((el) => rects.set(el.dataset.sortId!, boxOf(el).getBoundingClientRect()));
        before.current = rects;
      }
      setState((s) => {
        const from = s.order.indexOf(d.id);
        const to = s.order.indexOf(overId);
        if (from < 0 || to < 0) return s;
        const next = s.order.slice();
        next.splice(from, 1);
        next.splice(to, 0, d.id);
        return { ...s, order: next };
      });
    }
    // Once a touch drag has started, stop the page from scrolling under it.
    function onTouchMove(e: TouchEvent) {
      if (drag.current?.active) e.preventDefault();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && drag.current?.active) {
        drag.current = null;
        setDragging(null);
        setState((s) => ({ ...s, order: s.key.split(",") }));
      }
    }
    window.addEventListener("pointermove", onMove, { passive: false });
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [finish, activate]);

  /** Spread onto each item. The item must carry the same id. */
  const itemProps = (id: string) => ({
    "data-sort-id": id,
    "data-dragging": dragging === id ? "" : undefined,
    onPointerDown: (e: ReactPointerEvent) => {
      if (e.button !== 0) return;
      drag.current = {
        id,
        x: e.clientX,
        y: e.clientY,
        pointerType: e.pointerType,
        active: false,
        // Touch: hold still briefly to pick it up.
        timer: e.pointerType === "mouse" ? null : window.setTimeout(activate, TOUCH_HOLD_MS),
        moved: false,
      };
    },
    onClickCapture: (e: React.MouseEvent) => {
      // The click that ends a drag shouldn't open the notebook.
      if (suppressClick.current) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    onDragStart: (e: React.DragEvent) => e.preventDefault(),
    onContextMenu: (e: React.MouseEvent) => {
      if (drag.current && drag.current.pointerType !== "mouse") e.preventDefault();
    },
  });

  return { order, dragging, itemProps };
}

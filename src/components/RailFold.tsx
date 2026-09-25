"use client";

import { useState, type ReactNode } from "react";
import { Doodle } from "./Doodle";

/**
 * On phones the rail folds into one line (their time, weather, the countdown)
 * above the feed; tapping it opens the rest. On wider screens it's always open
 * and the summary line is hidden.
 */
export function RailFold({ summary, children }: { summary: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="rail-summary" aria-expanded={open} aria-controls="rail-body" onClick={() => setOpen((o) => !o)}>
        {summary}
        <Doodle name="chevron-down" size={14} className="rail-summary-chevron" />
      </button>
      <div id="rail-body" className="rail-body" data-open={open ? "" : undefined}>
        {children}
      </div>
    </>
  );
}

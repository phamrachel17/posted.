"use client";

import { useEffect, useState } from "react";
import { clockTime } from "@/lib/time";

/** A clock that starts from the server's time and ticks every 30 seconds. */
export function LiveClock({ timeZone, initial }: { timeZone: string; initial: string }) {
  const [text, setText] = useState(initial);
  useEffect(() => {
    const tick = () => setText(clockTime(timeZone));
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, [timeZone]);
  return <time suppressHydrationWarning>{text}</time>;
}

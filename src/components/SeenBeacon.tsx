"use client";

import { useEffect } from "react";

/** Tells the server you've looked, when you leave or hide the page. */
export function SeenBeacon() {
  useEffect(() => {
    const send = () => navigator.sendBeacon("/api/seen");
    const onVisibility = () => document.visibilityState === "hidden" && send();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", send);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", send);
    };
  }, []);
  return null;
}

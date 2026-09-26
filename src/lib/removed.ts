"use client";

import { useSyncExternalStore } from "react";

// Posts and notes you've just deleted. They stay hidden on this page even when a
// refresh arrives that still has them, so a deleted post never pops back.
const removed = new Set<string>();
const listeners = new Set<() => void>();

export function markRemoved(id: string) {
  removed.add(id);
  listeners.forEach((l) => l());
}

export function unmarkRemoved(id: string) {
  removed.delete(id);
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export function useRemoved(id: string) {
  return useSyncExternalStore(subscribe, () => removed.has(id), () => false);
}

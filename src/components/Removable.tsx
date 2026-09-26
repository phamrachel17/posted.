"use client";

import type { ReactNode } from "react";
import { useRemoved } from "@/lib/removed";

/** Shows its children until the post or note with this id is deleted here. */
export function Removable({ id, children }: { id: string; children: ReactNode }) {
  return useRemoved(id) ? null : <>{children}</>;
}

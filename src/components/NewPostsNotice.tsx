"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * When the other person posts while you're here, a quiet line appears at the
 * top instead of the feed jumping under you.
 */
export function NewPostsNotice({ spaceId, meId, partnerName }: { spaceId: string; meId: string; partnerName: string | null }) {
  const [waiting, setWaiting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!partnerName) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`posts:${spaceId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts", filter: `space_id=eq.${spaceId}` },
        (payload) => {
          if ((payload.new as { author_id?: string }).author_id !== meId) setWaiting(true);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [spaceId, meId, partnerName]);

  if (!waiting || !partnerName) return null;
  return (
    <button
      type="button"
      className="new-posts"
      onClick={() => {
        setWaiting(false);
        router.refresh();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
    >
      {partnerName} just posted
    </button>
  );
}

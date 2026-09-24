"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const OnlineContext = createContext<ReadonlySet<string>>(new Set());

type Props = {
  spaceId: string;
  meId: string;
  children: React.ReactNode;
  /** Design preview: a fixed set of online members, no connection. */
  preview?: string[];
};

/**
 * Tracks who has posted. open and on screen, using Supabase Realtime presence.
 * You count as online only while the tab is visible.
 */
export function PresenceProvider({ spaceId, meId, children, preview }: Props) {
  const [online, setOnline] = useState<ReadonlySet<string>>(() => new Set(preview ?? []));

  useEffect(() => {
    if (preview) return;
    const supabase = createClient();
    const channel = supabase.channel(`presence:${spaceId}`, { config: { presence: { key: meId } } });

    const sync = () => setOnline(new Set(Object.keys(channel.presenceState())));
    const track = () => {
      if (document.visibilityState === "visible") channel.track({ at: Date.now() });
      else channel.untrack();
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") track();
      });
    document.addEventListener("visibilitychange", track);

    return () => {
      document.removeEventListener("visibilitychange", track);
      supabase.removeChannel(channel);
    };
  }, [spaceId, meId, preview]);

  return <OnlineContext.Provider value={online}>{children}</OnlineContext.Provider>;
}

/** A green dot while this person has the app open. Renders nothing otherwise. */
export function OnlineDot({ memberId, label }: { memberId: string; label?: string }) {
  const online = useContext(OnlineContext).has(memberId);
  if (!online) return null;
  return (
    <span className="online" title={label ? `${label} is online` : "Online"}>
      <span className="online-dot" aria-hidden />
      <span className="visually-hidden">{label ? `${label} is online` : "Online"}</span>
    </span>
  );
}

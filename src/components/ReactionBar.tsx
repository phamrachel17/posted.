"use client";

import { useOptimistic, useRef, useState, useTransition } from "react";
import { toggleReaction } from "@/app/actions/posts";
import { inkStyle } from "@/lib/inks";
import type { People } from "@/lib/people";
import { EMOJI, type Emoji, type Reaction } from "@/lib/types";
import { Doodle } from "./Doodle";

type Props = {
  target: { postId?: string; replyId?: string };
  reactions: Reaction[];
  people: People;
  readOnly?: boolean;
};

const LONG_PRESS_MS = 420;

/** The heart (filled red when you've given one, with how many hearts it has) and emoji in whoever's ink. */
export function ReactionBar({ target, reactions, people, readOnly }: Props) {
  const [optimistic, apply] = useOptimistic(reactions, (list: Reaction[], change: { emoji: Emoji; on: boolean }) =>
    change.on
      ? [...list, { member_id: people.meId, emoji: change.emoji }]
      : list.filter((r) => !(r.member_id === people.meId && r.emoji === change.emoji)),
  );
  const [, startTransition] = useTransition();
  const [trayOpen, setTrayOpen] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const mine = (emoji: Emoji) => optimistic.some((r) => r.member_id === people.meId && r.emoji === emoji);

  function set(emoji: Emoji, on: boolean) {
    if (readOnly) return;
    setTrayOpen(false);
    startTransition(async () => {
      apply({ emoji, on });
      await toggleReaction(target, emoji, on);
    });
  }

  // Show the other person's reactions first, then mine, hearts before emoji.
  const order = (r: Reaction) => (r.member_id === people.meId ? 1 : 0) * 10 + (r.emoji === "heart" ? 0 : 1);
  // Hearts are counted on the heart itself; emoji still show as stamps in whoever's ink.
  const stamps = [...optimistic].sort((a, b) => order(a) - order(b)).filter((r) => r.emoji !== "heart");
  const hearted = mine("heart");
  const hearts = optimistic.filter((r) => r.emoji === "heart").length;
  const me = people.byId[people.meId];

  return (
    <div
      className="reactions"
      onMouseLeave={() => setTrayOpen(false)}
      onKeyDown={(e) => e.key === "Escape" && setTrayOpen(false)}
    >
      <button
        type="button"
        className={hearted ? "heart-btn on" : "heart-btn"}
        aria-pressed={hearted}
        aria-label={`${hearted ? "Take back your heart" : "Heart"}${hearts ? ` (${hearts})` : ""}`}
        disabled={readOnly}
        onMouseEnter={() => !readOnly && window.matchMedia("(hover: hover)").matches && setTrayOpen(true)}
        onPointerDown={(e) => {
          if (e.pointerType !== "touch") return;
          longPressed.current = false;
          pressTimer.current = window.setTimeout(() => {
            longPressed.current = true;
            setTrayOpen(true);
          }, LONG_PRESS_MS);
        }}
        onPointerUp={() => pressTimer.current && window.clearTimeout(pressTimer.current)}
        onPointerCancel={() => pressTimer.current && window.clearTimeout(pressTimer.current)}
        onContextMenu={(e) => e.preventDefault()}
        onClick={() => {
          if (longPressed.current) {
            longPressed.current = false;
            return;
          }
          set("heart", !hearted);
        }}
      >
        <Doodle name={hearted ? "heart-filled" : "heart"} size={20} />
        {hearts > 0 && <span className="heart-count">{hearts}</span>}
      </button>

      {stamps.map((r) => {
        const who = people.byId[r.member_id];
        const isMine = r.member_id === people.meId;
        return (
          <button
            type="button"
            key={`${r.member_id}-${r.emoji}`}
            className="stamp"
            style={who ? inkStyle(who.ink) : undefined}
            title={who ? `${who.name}` : undefined}
            aria-label={`${who?.name ?? "Someone"}: ${r.emoji === "heart" ? "heart" : r.emoji}${isMine ? ". Click to take it back." : ""}`}
            onClick={() => isMine && set(r.emoji, false)}
            disabled={!isMine || readOnly}
          >
            {r.emoji === "heart" ? <Doodle name="heart" size={15} className="stamp-heart" /> : r.emoji}
          </button>
        );
      })}

      {trayOpen && (
        <div className="tray" role="menu" aria-label="React">
          {EMOJI.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="menuitemcheckbox"
              aria-checked={mine(emoji)}
              className={mine(emoji) ? "on" : undefined}
              style={emoji === "heart" && me ? inkStyle(me.ink) : undefined}
              aria-label={emoji === "heart" ? "Heart" : emoji}
              onClick={() => set(emoji, !mine(emoji))}
            >
              {emoji === "heart" ? <Doodle name="heart" size={20} /> : emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

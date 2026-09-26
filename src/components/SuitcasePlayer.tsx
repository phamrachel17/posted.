"use client";

/* eslint-disable @next/next/no-img-element -- the couple is a local drawing; album art comes from Spotify's CDN */
import { useId, useState } from "react";

type Props = {
  playing: boolean;
  /** 0–1 through the song; the tone arm creeps inward as it goes. */
  progress: number;
  /** The song's album cover, the record's label. */
  image: string | null;
  /** Changes when a new record goes on, so it slides on. */
  songKey: string | null;
  label: string;
  onToggle: () => void;
};

// Tone arm angles: parked off the record, on its outer edge, and near the label.
const REST = -36;
const START = 0;
const END = 16;

/**
 * The record player: Rachel's drawing of an open suitcase turntable, with the two
 * of you dancing on the record. The record turns while music plays, the arm swings
 * on and creeps inward, and a few notes drift up.
 */
export function SuitcasePlayer({ playing, progress, image, songKey, label, onToggle }: Props) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  // The record only slides on when the song changes, not every time the page loads.
  const [firstKey] = useState(songKey);
  const id = (n: string) => `${n}-${uid}`;
  const armAngle = playing || progress > 0 ? START + (END - START) * Math.min(1, Math.max(0, progress)) : REST;

  return (
    <div
      className={playing ? "suitcase is-playing" : "suitcase"}
      role="button"
      tabIndex={0}
      aria-label={label}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onToggle();
        }
      }}
    >
      <svg viewBox="0 0 670 740" aria-hidden>
        <defs>
          <filter id={id("inked")} x="-4%" y="-4%" width="108%" height="108%">
            <feTurbulence type="fractalNoise" baseFrequency=".025" numOctaves="2" seed="6" result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3" />
          </filter>
          <clipPath id={id("label")}><circle cx="0" cy="0" r="27" /></clipPath>
        </defs>

        <ellipse cx="345" cy="712" rx="300" ry="18" fill="rgb(28 33 43 / .14)" />
        {/* The suitcase: Rachel's drawing, with its own record and arm erased so these can move */}
        <image href="/doodles/record-player.png" x="0" y="0" width="670" height="707" />

        {/* The record: a flat disc tilted onto the deck, turning */}
        <g transform="translate(273 471) scale(2.37 1.13)">
          <g className={songKey !== firstKey ? "suitcase-record is-new" : "suitcase-record"} key={songKey ?? "none"}>
            <ellipse cx="0" cy="10" rx="92" ry="92" fill="rgb(28 33 43 / .22)" />
            <g className="suitcase-spin">
              <g filter={`url(#${id("inked")})`}>
                <circle cx="0" cy="0" r="92" fill="#4F7D3A" stroke="#443223" strokeWidth="3.4" />
                <g fill="none" stroke="#2f4f22" strokeLinecap="round">
                  <path d="M-84 6 A84 84 0 1 1 -40 74" strokeWidth="2.2" />
                  <path d="M-74 -12 A75 75 0 0 1 58 -48" strokeWidth="1.6" />
                  <path d="M70 -20 A75 75 0 0 1 -30 69" strokeWidth="1.8" />
                  <path d="M-64 18 A66 66 0 0 1 20 -63" strokeWidth="2.4" />
                  <path d="M44 -49 A66 66 0 0 1 36 55" strokeWidth="1.5" />
                  <path d="M8 66 A66 66 0 0 1 -60 30" strokeWidth="1.9" />
                  <path d="M-55 -4 A56 56 0 1 1 -24 51" strokeWidth="1.7" />
                  <path d="M-44 -18 A47 47 0 0 1 42 -22" strokeWidth="2.1" />
                  <path d="M45 10 A47 47 0 0 1 -34 32" strokeWidth="1.5" />
                  <path d="M-38 -12 A39 39 0 1 1 -10 38" strokeWidth="1.3" />
                </g>
                <path d="M-70 -44 A84 84 0 0 1 -10 -83" fill="none" stroke="#b8d4a6" strokeWidth="3" strokeLinecap="round" opacity=".55" />
                <path d="M58 58 A84 84 0 0 1 20 80" fill="none" stroke="#b8d4a6" strokeWidth="2" strokeLinecap="round" opacity=".4" />
              </g>
              <g clipPath={`url(#${id("label")})`}>
                {image ? (
                  <image href={image} x="-27" y="-27" width="54" height="54" preserveAspectRatio="xMidYMid slice" />
                ) : (
                  <rect x="-27" y="-27" width="54" height="54" fill="#DBC4A5" />
                )}
              </g>
              <circle cx="0" cy="0" r="27" fill="none" stroke="#443223" strokeWidth="2.2" filter={`url(#${id("inked")})`} />
              <circle cx="0" cy="0" r="3" fill="#443223" />
            </g>
          </g>
        </g>

        {/* The tone arm, redrawn in her line so it can swing */}
        <g className="suitcase-arm" style={{ transform: `rotate(${armAngle}deg)` }} filter={`url(#${id("inked")})`} stroke="#443223" strokeLinecap="round" strokeLinejoin="round">
          <path d="M443 376 L407 506" strokeWidth="9" />
          <path d="M443 376 L407 506" stroke="#EFE3D2" strokeWidth="4" />
          <path d="M395 500 L417 506 L412 526 L390 520 Z" fill="#443223" strokeWidth="3" />
        </g>
        <g stroke="#443223" strokeWidth="4" filter={`url(#${id("inked")})`}>
          <circle cx="443" cy="376" r="15" fill="#EFE3D2" />
          <circle cx="443" cy="376" r="5" fill="#443223" />
        </g>

        {/* Notes that drift up while it plays */}
        <g fill="#443223" fontFamily="Georgia, serif" fontWeight="700">
          <text className="suitcase-note" x="180" y="260" fontSize="40">♪</text>
          <text className="suitcase-note" x="300" y="230" fontSize="32">♫</text>
          <text className="suitcase-note" x="370" y="272" fontSize="36">♪</text>
          <text className="suitcase-note" x="245" y="205" fontSize="30" fill="#CF3345">♥</text>
        </g>
      </svg>
      {/* The two of you on the record's center, turning with it */}
      <div className="suitcase-couple">
        <img src="/doodles/couple-color.png" alt="" width={600} height={457} />
      </div>
    </div>
  );
}

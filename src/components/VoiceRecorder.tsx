"use client";

import { useEffect, useRef, useState } from "react";
import { MAX_VOICE_MS, formatDuration, useRecorder, type Recording } from "@/lib/voice";
import { clearPending, loadPending, savePending } from "@/lib/pending";
import { uploadAudio } from "@/lib/upload";
import type { NewAudio } from "@/app/actions/posts";
import { Doodle } from "./Doodle";
import { VoicePlayer } from "./VoicePlayer";

type Props = {
  spaceId: string;
  /** Where a failed upload is parked: "post" or "reply:<postId>". */
  target: string;
  notebookId?: string | null;
  /** Start recording as soon as this mounts (the mic was just tapped). */
  autoStart?: boolean;
  withCaption?: boolean;
  submitLabel?: string;
  onSubmit: (audio: NewAudio, caption: string) => Promise<{ error?: string }>;
  onClose: () => void;
};

const PROBLEMS = {
  blocked: {
    title: "posted. can't use your microphone.",
    body: "Click the lock icon in the address bar, set Microphone to Allow, then try again.",
  },
  unsupported: { title: "This browser can't record audio.", body: "Try the latest Chrome, Safari, or Firefox." },
  "too-short": { title: "That was too short to keep.", body: "Tap once to start, then again when you're done." },
  failed: { title: "The recording didn't start.", body: "Check that a microphone is connected, then try again." },
};

export function VoiceRecorder({ spaceId, target, notebookId, autoStart, withCaption, submitLabel = "Post", onSubmit, onClose }: Props) {
  const rec = useRecorder();
  const [caption, setCaption] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const started = useRef(false);

  // Bring back a memo that failed to upload last time, or start fresh.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    loadPending(target).then((pending) => {
      if (pending) {
        rec.restore(pending);
        setCaption(pending.caption ?? "");
        setSendError("This memo hasn't been sent yet. It's saved in this browser.");
      } else if (autoStart) {
        rec.start();
      }
    });
  }, [autoStart, rec, target]);

  async function send(recording: Recording) {
    setSending(true);
    setSendError(null);
    let audio: NewAudio;
    try {
      audio = await uploadAudio(spaceId, recording);
    } catch {
      await savePending({ target, notebookId, caption, ...recording });
      setSending(false);
      setSendError("This memo hasn't been sent yet. The connection dropped while uploading, but it's saved in this browser.");
      return;
    }
    const result = await onSubmit(audio, caption);
    setSending(false);
    if (result.error) {
      await savePending({ target, notebookId, caption, ...recording });
      setSendError(result.error);
      return;
    }
    await clearPending(target);
    rec.reset();
    onClose();
  }

  async function discard() {
    await clearPending(target);
    rec.cancel();
    onClose();
  }

  const problem = rec.problem ? PROBLEMS[rec.problem] : null;

  if (rec.state === "recording" || rec.state === "starting") {
    const remaining = MAX_VOICE_MS - rec.elapsed;
    const max = Math.max(0.02, ...rec.live);
    return (
      <div className="recorder">
        <div className="recorder-top">
          <span className="rec-dot" aria-hidden />
          <span className="rec-timer" role="timer">{formatDuration(rec.elapsed)}</span>
          <span className="hint">{rec.state === "starting" ? "Starting…" : `${formatDuration(remaining)} left`}</span>
        </div>
        <div className="voice-wave live" aria-hidden>
          {Array.from({ length: 48 }, (_, i) => {
            const v = rec.live[rec.live.length - 48 + i];
            return <i key={i} className="on" style={{ height: `${v === undefined ? 6 : Math.max(8, (v / max) * 100)}%` }} />;
          })}
        </div>
        <div className="recorder-actions">
          <button type="button" className="btn btn-quiet" onClick={discard}>Cancel</button>
          <button type="button" className="rec-stop" onClick={rec.stop} aria-label="Stop recording">
            <Doodle name="stop" size={18} />
          </button>
          <span />
        </div>
      </div>
    );
  }

  if (rec.state === "review" && rec.recording) {
    return (
      <div className="recorder">
        <VoicePlayer id="draft" draft url={rec.recording.url} durationMs={rec.recording.duration_ms} peaks={rec.recording.peaks} />
        {withCaption && (
          <input
            className="recorder-caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a line (optional)"
            maxLength={500}
            aria-label="Caption"
          />
        )}
        {sendError && <p className="error-note"><b>{sendError}</b></p>}
        <div className="recorder-actions">
          <button type="button" className="btn btn-quiet" onClick={discard} disabled={sending}>Throw away</button>
          <button type="button" className="btn btn-quiet" onClick={async () => { await clearPending(target); rec.reset(); rec.start(); }} disabled={sending}>
            Record again
          </button>
          <button type="button" className="btn btn-primary" onClick={() => send(rec.recording!)} disabled={sending}>
            {sending ? "Sending…" : sendError ? "Try again" : submitLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="recorder recorder-idle">
      {problem && (
        <p className="error-note">
          <b>{problem.title}</b>
          <span>{problem.body}</span>
        </p>
      )}
      <button type="button" className="rec-big" onClick={rec.start} aria-label="Start recording">
        <Doodle name="mic" size={26} />
      </button>
      <span className="hint">Tap to talk. Up to 5 minutes.</span>
      <button type="button" className="btn btn-quiet" onClick={onClose}>Cancel</button>
    </div>
  );
}

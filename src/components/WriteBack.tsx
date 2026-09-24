"use client";

import { useState, useTransition } from "react";
import { createReply } from "@/app/actions/posts";
import { Doodle } from "./Doodle";
import { VoiceRecorder } from "./VoiceRecorder";

/** The field under a post: write a note, or tap the mic to leave a voice memo. */
type Props = {
  postId: string;
  spaceId: string;
  partnerName?: string;
  /** Called after a note is sent (the inline version closes itself). */
  onSent?: () => void;
  autoFocus?: boolean;
};

export function WriteBack({ postId, spaceId, partnerName, onSent, autoFocus }: Props) {
  const [text, setText] = useState("");
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (recording) {
    return (
      <div className="composer">
        <VoiceRecorder
          spaceId={spaceId}
          target={`reply:${postId}`}
          autoStart
          submitLabel="Send"
          onSubmit={async (audio) => {
            const result = await createReply({ postId, body: "", audio });
            if (!result.error) onSent?.();
            return result;
          }}
          onClose={() => setRecording(false)}
        />
      </div>
    );
  }

  return (
    <form
      className="write-back"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        startTransition(async () => {
          const result = await createReply({ postId, body: text });
          if (result.error) setError(result.error);
          else {
            setText("");
            setError(null);
            onSent?.();
          }
        });
      }}
    >
      <div className="write-back-field">
        <label htmlFor="write-back" className="visually-hidden">Write back</label>
        <textarea
          id="write-back"
          rows={1}
          value={text}
          maxLength={5000}
          autoFocus={autoFocus}
          placeholder={partnerName ? `Write back to ${partnerName}…` : "Write back…"}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit();
          }}
        />
        {text.trim() ? (
          <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? "Sending…" : "Send"}</button>
        ) : (
          <button type="button" className="composer-mic" aria-label="Record a voice note" onClick={() => setRecording(true)}>
            <Doodle name="mic" size={20} />
          </button>
        )}
      </div>
      {error && <p className="error-note"><b>{error}</b></p>}
    </form>
  );
}

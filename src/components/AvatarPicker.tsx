"use client";

import { useRef, useState, useTransition } from "react";
import { setAvatar } from "@/app/actions/space";
import { AVATAR_ICONS } from "@/lib/avatars";
import { PhotoError } from "@/lib/images";
import type { Ink } from "@/lib/inks";
import { removeUpload, uploadAvatar } from "@/lib/upload";
import { Avatar } from "./Avatar";
import { Doodle } from "./Doodle";

type Props = { spaceId: string; name: string; ink: Ink; url: string | null; icon: string | null };

/** Your profile picture: a photo, one of the drawings, or just your initial. */
export function AvatarPicker({ spaceId, name, ink, url, icon }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const busy = uploading || pending;

  function choose(choice: Parameters<typeof setAvatar>[0]) {
    setError(null);
    startTransition(async () => {
      const result = await setAvatar(choice);
      if (result.error) {
        setError(result.error);
        if (choice && "path" in choice) void removeUpload(choice.path);
      }
    });
  }

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const path = await uploadAvatar(spaceId, file);
      choose({ path });
    } catch (err) {
      setError(err instanceof PhotoError ? err.message : "The picture couldn't be uploaded. Try again.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="avatar-picker">
      <div className="avatar-picker-now">
        <Avatar name={name} ink={ink} url={url} icon={icon} size={76} />
        <div className="avatar-picker-actions">
          <button type="button" className="btn" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Doodle name="camera" size={16} /> {uploading ? "Uploading…" : url ? "Change photo" : "Upload a photo"}
          </button>
          {(url || icon) && (
            <button type="button" className="btn btn-quiet" disabled={busy} onClick={() => choose(null)}>
              Use my initial
            </button>
          )}
          <input ref={fileRef} type="file" hidden accept="image/*,.heic,.heif" onChange={(e) => onFile(e.target.files?.[0])} />
        </div>
      </div>
      <div className="avatar-icons" role="radiogroup" aria-label="Or pick a drawing">
        {AVATAR_ICONS.map((name2) => (
          <button
            key={name2}
            type="button"
            role="radio"
            aria-checked={!url && icon === name2}
            aria-label={name2.replace(/^(st|nb|mood)-/, "").replace(/-/g, " ")}
            disabled={busy}
            onClick={() => choose({ icon: name2 })}
          >
            <Avatar name={name} ink={ink} icon={name2} size={40} />
          </button>
        ))}
      </div>
      {error && <p className="error-note"><b>{error}</b></p>}
    </div>
  );
}

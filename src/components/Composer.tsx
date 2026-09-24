"use client";

/* eslint-disable @next/next/no-img-element -- local blob previews */
import { useEffect, useRef, useState, useTransition } from "react";
import { createPost } from "@/app/actions/posts";
import { removeUpload, uploadPhoto } from "@/lib/upload";
import { DAY_PROMPTS, WEATHER } from "@/lib/day";
import { RECORD_EVENT } from "@/lib/events";
import type { DayMeta, NotebookRef, Weather } from "@/lib/types";
import type { NewPhoto } from "@/app/actions/posts";
import { Doodle } from "./Doodle";
import { VoiceRecorder } from "./VoiceRecorder";

const MAX_PHOTOS = 6;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

type Attached = { id: string; preview: string; status: "uploading" | "ready" | "failed"; photo?: NewPhoto };
type Mode = "write" | "voice" | "day";

function storage(key: string, value?: string) {
  try {
    if (value === undefined) return localStorage.getItem(key) ?? "";
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // Private windows can refuse storage. Drafts just won't survive a reload.
  }
  return "";
}

type Props = {
  spaceId: string;
  /** Notebooks to offer in the picker. Omit when the notebook is fixed. */
  notebooks?: NotebookRef[];
  /** Posts from this composer go to this notebook. */
  notebookId?: string | null;
  placeholder?: string;
  preview?: boolean;
  /** Start in voice mode and record right away (from the mobile mic button). */
  startRecording?: boolean;
};

export function Composer({ spaceId, notebooks, notebookId: fixedNotebook, placeholder, preview, startRecording }: Props) {
  const draftKey = `posted:draft:${fixedNotebook ?? "today"}`;
  const [mode, setMode] = useState<Mode>(startRecording ? "voice" : "write");
  const [autoStart, setAutoStart] = useState(Boolean(startRecording));
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Attached[]>([]);
  const [notebookId, setNotebookId] = useState<string>("");
  const [day, setDay] = useState<Partial<DayMeta>>({});
  const [openPrompts, setOpenPrompts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const target = fixedNotebook ?? (notebookId || null);

  useEffect(() => {
    const draft = storage(draftKey);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after mount
    if (draft) setBody(draft);
  }, [draftKey]);

  // Keyboard: "n" writes, "v" records. The mobile mic button sends RECORD_EVENT.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.target as HTMLElement).closest("input, textarea, select, [contenteditable], [role=slider]")) return;
      if (e.key === "n") {
        e.preventDefault();
        setMode("write");
        requestAnimationFrame(() => textRef.current?.focus());
      } else if (e.key === "v" && !preview) {
        e.preventDefault();
        setAutoStart(true);
        setMode("voice");
      }
    }
    function onRecord() {
      if (preview) return;
      setAutoStart(true);
      setMode("voice");
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener(RECORD_EVENT, onRecord);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener(RECORD_EVENT, onRecord);
    };
  }, [preview]);

  function update(id: string, patch: Partial<Attached>) {
    setPhotos((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function onPick(files: FileList | null) {
    if (!files) return;
    setError(null);
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(files);
    if (picked.length > room) setError(`A post can hold ${MAX_PHOTOS} photos. The extras weren't added.`);
    for (const file of picked.slice(0, room)) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`${file.name} is over 25 MB. Try exporting a smaller copy.`);
        continue;
      }
      const id = crypto.randomUUID();
      setPhotos((list) => [...list, { id, preview: URL.createObjectURL(file), status: "uploading" }]);
      if (!preview) {
        uploadPhoto(spaceId, file).then(
          (photo) => update(id, { status: "ready", photo }),
          () => update(id, { status: "failed" }),
        );
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function remove(item: Attached) {
    URL.revokeObjectURL(item.preview);
    setPhotos((list) => list.filter((p) => p.id !== item.id));
    if (item.photo) removeUpload(item.photo.path);
  }

  const uploading = photos.some((p) => p.status === "uploading");
  const failed = photos.some((p) => p.status === "failed");
  const ready = photos.filter((p) => p.photo).map((p) => p.photo!);
  const canPost =
    !preview && !pending &&
    (mode === "day" ? Boolean(day.weather) : !uploading && !failed && (body.trim() !== "" || ready.length > 0));

  function submit() {
    if (!canPost) return;
    setError(null);
    startTransition(async () => {
      const result =
        mode === "day"
          ? await createPost({ body: "", notebookId: null, day: day as DayMeta })
          : await createPost({ body, notebookId: target, photos: ready });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (mode === "day") {
        setDay({});
        setOpenPrompts([]);
        setMode("write");
      } else {
        photos.forEach((p) => URL.revokeObjectURL(p.preview));
        setPhotos([]);
        setBody("");
        storage(draftKey, "");
      }
    });
  }

  const picker = notebooks && notebooks.length > 0 && !fixedNotebook && (
    <label className="composer-where">
      <span className="visually-hidden">Post to</span>
      <select value={notebookId} onChange={(e) => setNotebookId(e.target.value)}>
        <option value="">Today only</option>
        {notebooks.map((n) => <option key={n.id} value={n.id}>{n.name}</option>)}
      </select>
      <Doodle name="down" size={14} />
    </label>
  );

  if (mode === "voice") {
    return (
      <div className="composer">
        <VoiceRecorder
          spaceId={spaceId}
          target={`post:${fixedNotebook ?? "today"}`}
          notebookId={target}
          autoStart={autoStart}
          withCaption
          onSubmit={(audio, caption) => createPost({ body: caption, notebookId: target, audio })}
          onClose={() => {
            setAutoStart(false);
            setMode("write");
          }}
        />
      </div>
    );
  }

  if (mode === "day") {
    return (
      <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
        <div className="day-compose-head">
          <b>My day</b>
          <span className="hint">Only the weather is needed</span>
        </div>
        <div className="weather-pick" role="radiogroup" aria-label="Weather">
          {WEATHER.map((w) => (
            <button
              key={w.id}
              type="button"
              role="radio"
              aria-checked={day.weather === w.id}
              aria-label={w.label}
              title={w.label}
              onClick={() => setDay((d) => ({ ...d, weather: w.id as Weather }))}
            >
              <Doodle name={`weather-${w.id}`} size={30} />
            </button>
          ))}
        </div>
        <div className="energy-pick" role="radiogroup" aria-label="Energy">
          <span>Energy</span>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={day.energy === n}
              aria-label={`${n} of 5`}
              className={day.energy && n <= day.energy ? "on" : undefined}
              onClick={() => setDay((d) => ({ ...d, energy: d.energy === n ? undefined : n }))}
            />
          ))}
        </div>
        {DAY_PROMPTS.filter((p) => openPrompts.includes(p.key)).map((p) => (
          <div className="field" key={p.key}>
            <label className="label" htmlFor={`day-${p.key}`}>{p.label}</label>
            <input
              id={`day-${p.key}`}
              type="text"
              maxLength={1000}
              autoFocus
              value={(day[p.key] as string) ?? ""}
              onChange={(e) => setDay((d) => ({ ...d, [p.key]: e.target.value }))}
            />
          </div>
        ))}
        <div className="chips">
          {DAY_PROMPTS.filter((p) => !openPrompts.includes(p.key)).map((p) => (
            <button key={p.key} type="button" className="chip" onClick={() => setOpenPrompts((o) => [...o, p.key])}>
              + {p.label}
            </button>
          ))}
        </div>
        {error && <p className="error-note"><b>{error}</b></p>}
        <div className="composer-row">
          <button type="button" className="composer-tool" onClick={() => setMode("write")}>Cancel</button>
          <span className="hint composer-day-where">Posts to Today</span>
          <button type="submit" className="btn btn-primary" disabled={!canPost}>{pending ? "Posting…" : "Post"}</button>
        </div>
      </form>
    );
  }

  return (
    <form className="composer" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <label htmlFor={`composer-${draftKey}`} className="visually-hidden">What&rsquo;s on your mind?</label>
      <textarea
        id={`composer-${draftKey}`}
        ref={textRef}
        value={body}
        placeholder={placeholder ?? "What’s on your mind?"}
        rows={1}
        maxLength={10_000}
        onChange={(e) => {
          setBody(e.target.value);
          storage(draftKey, e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
      />

      {photos.length > 0 && (
        <div className="composer-thumbs">
          {photos.map((p) => (
            <div className="composer-thumb" key={p.id} style={{ opacity: p.status === "uploading" ? 0.55 : 1 }}>
              <img src={p.preview} alt="" />
              <button type="button" onClick={() => remove(p)} aria-label="Remove photo">
                <Doodle name="close" size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {failed && (
        <p className="error-note">
          <b>A photo didn&rsquo;t upload.</b>
          <span>Remove it and add it again. If it keeps failing, it may be a format this browser can&rsquo;t read, so try a JPEG.</span>
        </p>
      )}
      {error && <p className="error-note"><b>{error}</b></p>}

      <div className="composer-row">
        <button type="button" className="composer-tool" onClick={() => fileRef.current?.click()}>
          <Doodle name="camera" size={18} />
          <span className="tool-label">Photo</span>
        </button>
        <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={(e) => onPick(e.target.files)} />
        {!fixedNotebook && (
          <button type="button" className="composer-tool" onClick={() => setMode("day")}>
            <Doodle name="day" size={18} />
            <span className="tool-label">My day</span>
          </button>
        )}
        {picker}
        <button
          type="button"
          className="composer-mic"
          aria-label="Record a voice memo"
          disabled={preview}
          onClick={() => {
            setAutoStart(true);
            setMode("voice");
          }}
        >
          <Doodle name="mic" size={20} />
        </button>
        {(body.trim() || photos.length > 0) && (
          <button type="submit" className="btn btn-primary" disabled={!canPost}>
            {pending ? "Posting…" : uploading ? "Uploading…" : "Post"}
          </button>
        )}
      </div>
      {preview && <p className="hint">Posting is off in the preview.</p>}
    </form>
  );
}

"use client";

/* eslint-disable @next/next/no-img-element -- local blob previews */
import { useEffect, useRef, useState, useTransition } from "react";
import { createPost } from "@/app/actions/posts";
import { removeUpload, uploadPhoto } from "@/lib/upload";
import { PhotoError } from "@/lib/images";
import { RECORD_EVENT } from "@/lib/events";
import type { DayMeta, NotebookRef, Post } from "@/lib/types";
import { localStamp } from "@/lib/time";
import { PENDING_DONE_EVENT, PENDING_EVENT, type PendingDetail } from "./PendingPosts";
import type { NewPhoto } from "@/app/actions/posts";
import { Doodle } from "./Doodle";
import { DayFields, dayBounds } from "./DayFields";
import { VoiceRecorder } from "./VoiceRecorder";
import { Stamp } from "./Stamp";
import { StampChooser } from "./StampChooser";
import { DEFAULT_STAMP, FALLBACK_STAMP, stampView, type BookStamp, type CityStamp } from "@/lib/stamps";
import type { People } from "@/lib/people";

const MAX_PHOTOS = 6;
const MAX_FILE_BYTES = 25 * 1024 * 1024;

type Attached = { id: string; file: File; preview: string; status: "uploading" | "ready" | "failed"; photo?: NewPhoto; problem?: { title: string; detail?: string } };
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
  /** Your time zone, for picking which day a My day is for. */
  timeZone?: string;
  /** Postage stamps, for posts to Today. Omit where posts don't get stamps. */
  stamps?: { book: BookStamp[]; defaultStamp: string | null; people: People; city: CityStamp | null };
  /** Who's posting, so a new post can show up the moment it's sent. */
  people?: People;
};

export function Composer({ spaceId, notebooks, notebookId: fixedNotebook, placeholder, preview, startRecording, timeZone, stamps, people: peopleProp }: Props) {
  const people = peopleProp ?? stamps?.people;
  const draftKey = `posted:draft:${spaceId}:${fixedNotebook ?? "today"}`;
  const [mode, setMode] = useState<Mode>(startRecording ? "voice" : "write");
  const [autoStart, setAutoStart] = useState(Boolean(startRecording));
  const [body, setBody] = useState("");
  const [photos, setPhotos] = useState<Attached[]>([]);
  const [notebookId, setNotebookId] = useState<string>("");
  const [day, setDay] = useState<Partial<DayMeta>>({});
  const zone = timeZone ?? "UTC";
  const [dayDate, setDayDate] = useState(() => dayBounds(zone).today);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const target = fixedNotebook ?? (notebookId || null);
  const [stamp, setStamp] = useState(stamps?.defaultStamp || DEFAULT_STAMP);
  const [book, setBook] = useState<BookStamp[]>(stamps?.book ?? []);
  const [stampOpen, setStampOpen] = useState(false);
  // Only posts to Today get a stamp.
  const stamped = Boolean(stamps) && !target;
  const stampToSend = stamped ? stamp : null;
  const stampUrls = Object.fromEntries(book.map((b) => [b.path, b.url]));
  const currentStamp = stampView(stamp, stampUrls, { mine: stamps?.city }) ?? stampView(FALLBACK_STAMP, {});

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
      setPhotos((list) => [...list, { id, file, preview: URL.createObjectURL(file), status: "uploading" }]);
      if (!preview) {
        uploadPhoto(spaceId, file).then(
          (photo) => update(id, { status: "ready", photo }),
          (err: unknown) => {
            console.error("Photo failed:", err);
            const problem =
              err instanceof PhotoError
                ? { title: err.message, detail: err.detail }
                : { title: `${file.name} didn't upload.`, detail: err instanceof Error ? err.message : undefined };
            update(id, { status: "failed", problem });
          },
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
    (mode === "day" ? Boolean(day.mood || day.note?.trim()) && !uploading && !failed : !uploading && !failed && (body.trim() !== "" || ready.length > 0));

  /** The post as it will look, to show right away while the server saves it. */
  function pendingPost(): Post | null {
    const me = people?.byId[people.meId];
    // A My day for an earlier day goes further down the feed, so it isn't shown on top.
    if (!people || !me || (mode === "day" && dayDate !== dayBounds(zone).today)) return null;
    const now = new Date();
    return {
      id: `pending-${crypto.randomUUID()}`,
      author_id: people.meId,
      kind: mode === "day" ? "day" : ready.length ? "photo" : "note",
      body: mode === "day" ? null : body.trim() || null,
      meta: mode === "day" ? { ...day } : {},
      postmark: { city: me.city, tz: me.timezone, local: localStamp(now, me.timezone) },
      created_at: now.toISOString(),
      edited_at: null,
      notebook: null,
      photos: photos.filter((p) => p.photo).map((p) => ({ id: p.id, url: p.preview, width: p.photo!.width, height: p.photo!.height })),
      audio: null,
      reactions: [],
      latestReply: null,
      kept: false,
      stamp: stampToSend ? currentStamp : null,
    };
  }

  function submit() {
    if (!canPost) return;
    setError(null);
    const pending = pendingPost();
    const sentBody = body;
    if (pending) {
      window.dispatchEvent(new CustomEvent<PendingDetail>(PENDING_EVENT, { detail: { post: pending, notebookId: target } }));
      // The text box clears right away; it comes back if the post doesn't go through.
      if (mode !== "day") setBody("");
    }
    startTransition(async () => {
      const result =
        mode === "day"
          ? await createPost({ body: "", notebookId: null, day: day as DayMeta, dayDate, photos: ready, stamp: stampToSend })
          : await createPost({ body: sentBody, notebookId: target, photos: ready, stamp: stampToSend });
      if (pending) window.dispatchEvent(new CustomEvent(PENDING_DONE_EVENT, { detail: pending.id }));
      if (result.error) {
        setError(result.error);
        if (pending && mode !== "day") setBody(sentBody);
        return;
      }
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      if (mode === "day") {
        setDay({});
        setDayDate(dayBounds(zone).today);
        setMode("write");
      } else {
        setBody("");
        storage(draftKey, "");
      }
      setStampOpen(false);
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

  const stampButton = stamped && currentStamp && (
    <button
      type="button"
      className="composer-tool composer-stamp"
      aria-expanded={stampOpen}
      onClick={() => setStampOpen((o) => !o)}
    >
      <Stamp stamp={currentStamp} size="tiny" />
      <span className="tool-label">Stamp</span>
    </button>
  );

  const stampPanel = stamped && stampOpen && stamps && (
    <div className="composer-stamps">
      <StampChooser
        value={stamp}
        onChange={(v) => {
          setStamp(v);
          setStampOpen(false);
        }}
        book={book}
        onBookChange={setBook}
        people={stamps.people}
        city={stamps.city}
        postFiles={mode === "write" ? photos.map((p) => ({ id: p.id, file: p.file, preview: p.preview })) : []}
        preview={preview}
      />
      <span className="hint">Just for this post. Change your usual one in Settings.</span>
    </div>
  );

  const photoBits = (
    <>
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

    {photos
      .filter((p) => p.status === "failed")
      .map((p) => (
        <p className="error-note" key={`err-${p.id}`}>
          <b>{p.problem?.title ?? "A photo didn’t upload."}</b>
          <span>{p.problem?.detail ?? "Remove it and add it again."}</span>
        </p>
      ))}
    </>
  );

  const photoButton = (
    <>
      <button type="button" className="composer-tool" onClick={() => fileRef.current?.click()}>
        <Doodle name="camera" size={18} />
        <span className="tool-label">Photo</span>
      </button>
      <input ref={fileRef} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => onPick(e.target.files)} />
    </>
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
          onSubmit={(audio, caption) => createPost({ body: caption, notebookId: target, audio, stamp: stampToSend })}
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
          <span className="hint">A mood or a note is enough</span>
        </div>
        <DayFields value={day} onChange={setDay} date={dayDate} onDate={setDayDate} timeZone={zone} />
        {photoBits}
        {error && <p className="error-note"><b>{error}</b></p>}
        {stampPanel}
        <div className="composer-row">
          <button type="button" className="composer-tool" onClick={() => setMode("write")}>Cancel</button>
          {photoButton}
          {stampButton}
          <span className="hint composer-day-where">{dayDate === dayBounds(zone).today ? "Posts to Today" : "Added to that day"}</span>
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

      {photoBits}
      {error && <p className="error-note"><b>{error}</b></p>}
      {stampPanel}

      <div className="composer-row">
        {photoButton}
        {!fixedNotebook && (
          <button type="button" className="composer-tool" onClick={() => setMode("day")}>
            <Doodle name="day" size={18} />
            <span className="tool-label">My day</span>
          </button>
        )}
        {stampButton}
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

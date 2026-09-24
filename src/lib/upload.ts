import { createClient } from "./supabase/client";
import { PhotoError, preparePhoto } from "./images";
import type { NewAudio, NewPhoto } from "@/app/actions/posts";

export async function uploadPhoto(spaceId: string, file: File): Promise<NewPhoto> {
  const { blob, width, height } = await preparePhoto(file);
  const path = `${spaceId}/${crypto.randomUUID()}.jpg`;
  const { error } = await createClient().storage.from("media").upload(path, blob, { contentType: "image/jpeg", upsert: false });
  if (error) {
    console.error("Photo upload failed:", error);
    throw new PhotoError("The photo couldn't be uploaded.", `Storage said: ${error.message}`);
  }
  return { path, width, height, mime: "image/jpeg" };
}

export async function uploadAudio(
  spaceId: string,
  rec: { blob: Blob; mime: string; ext: string; duration_ms: number; peaks: number[] },
): Promise<NewAudio> {
  const path = `${spaceId}/${crypto.randomUUID()}.${rec.ext}`;
  const { error } = await createClient().storage.from("media").upload(path, rec.blob, { contentType: rec.mime, upsert: false });
  if (error) throw error;
  return { path, mime: rec.mime, duration_ms: rec.duration_ms, peaks: rec.peaks };
}

export function removeUpload(path: string) {
  return createClient().storage.from("media").remove([path]);
}

export const MAX_VIDEO_SECONDS = 30;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_GIF_BYTES = 10 * 1024 * 1024;

type Uploaded = { path: string; mime: string; width: number; height: number; duration_ms?: number };

/** Reads a video's size and length, which also proves this browser can play it. */
function probeVideo(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    const done = (fn: () => void) => {
      URL.revokeObjectURL(url);
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(() => done(() => reject(new PhotoError(`${file.name} took too long to open.`))), 15000);
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      done(() =>
        video.videoWidth
          ? resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration })
          : reject(new PhotoError(`This browser can't play ${file.name}.`, "Try exporting it as an MP4 (H.264), or add it from your phone.")),
      );
    video.onerror = () =>
      done(() =>
        reject(new PhotoError(`This browser can't play ${file.name}.`, "Try exporting it as an MP4 (H.264), or add it from your phone.")),
      );
    video.src = url;
  });
}

export async function uploadVideo(spaceId: string, file: File): Promise<Uploaded> {
  if (file.size > MAX_VIDEO_BYTES) {
    throw new PhotoError(`${file.name} is over 50 MB.`, "Trim it or export a smaller copy, then try again.");
  }
  const info = await probeVideo(file);
  if (info.duration > MAX_VIDEO_SECONDS + 1) {
    throw new PhotoError(`${file.name} is ${Math.round(info.duration)} seconds long.`, `Videos can be up to ${MAX_VIDEO_SECONDS} seconds. Trim it first.`);
  }
  const mime = file.type || "video/mp4";
  const ext = mime === "video/webm" ? "webm" : mime === "video/quicktime" ? "mov" : "mp4";
  const path = `${spaceId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await createClient().storage.from("media").upload(path, file, { contentType: mime, upsert: false });
  if (error) throw new PhotoError("The video couldn't be uploaded.", `Storage said: ${error.message}`);
  return { path, mime, width: info.width, height: info.height, duration_ms: Math.round(info.duration * 1000) };
}

/** GIFs upload as they are, since resizing would stop them moving. */
export async function uploadGif(spaceId: string, file: File): Promise<Uploaded> {
  if (file.size > MAX_GIF_BYTES) throw new PhotoError(`${file.name} is over 10 MB.`, "Try a shorter or smaller GIF.");
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.src = url;
  try {
    await img.decode();
  } catch {
    throw new PhotoError(`${file.name} couldn't be opened.`);
  } finally {
    URL.revokeObjectURL(url);
  }
  const path = `${spaceId}/${crypto.randomUUID()}.gif`;
  const { error } = await createClient().storage.from("media").upload(path, file, { contentType: "image/gif", upsert: false });
  if (error) throw new PhotoError("The GIF couldn't be uploaded.", `Storage said: ${error.message}`);
  return { path, mime: "image/gif", width: img.naturalWidth, height: img.naturalHeight };
}

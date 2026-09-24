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

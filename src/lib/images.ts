const MAX_EDGE = 2048;
const QUALITY = 0.85;

/** Why a photo couldn't be added, in words a person can act on. */
export class PhotoError extends Error {
  constructor(message: string, readonly detail?: string) {
    super(message);
  }
}

function isHeic(file: File) {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

/**
 * Chrome and Firefox can't read HEIC (the iPhone photo format), so convert it to
 * JPEG in the browser first. The converter is large, so it only loads when needed.
 */
async function heicToJpeg(file: File): Promise<File> {
  const { heicTo } = await import("heic-to");
  const jpeg = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  return new File([jpeg], file.name.replace(/\.(heic|heif)$/i, ".jpg"), { type: "image/jpeg" });
}

/** Decodes with createImageBitmap, falling back to an <img>, which Safari handles more reliably. */
async function decode(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; done: () => void }> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { source: bitmap, width: bitmap.width, height: bitmap.height, done: () => bitmap.close() };
  } catch {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    try {
      await img.decode();
    } catch {
      URL.revokeObjectURL(url);
      if (isHeic(file)) {
        throw new PhotoError(
          `${file.name} is a HEIC photo, which this browser can't open.`,
          "Try again from Safari, or on iPhone set Settings → Camera → Formats → Most Compatible.",
        );
      }
      throw new PhotoError(`This browser couldn't open ${file.name}.`, "Try saving it as a JPEG or PNG first.");
    }
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, done: () => URL.revokeObjectURL(url) };
  }
}

/**
 * Resizes a photo to 2048px on the long edge and re-encodes it as JPEG.
 * Re-encoding also drops EXIF data, including where the photo was taken.
 */
export async function preparePhoto(file: File): Promise<{ blob: Blob; width: number; height: number }> {
  let image;
  try {
    image = await decode(file);
  } catch (err) {
    if (!isHeic(file)) throw err;
    let jpeg: File;
    try {
      jpeg = await heicToJpeg(file);
    } catch {
      throw new PhotoError(
        `${file.name} couldn't be converted from HEIC.`,
        "Try exporting it as a JPEG first, or on iPhone set Settings → Camera → Formats → Most Compatible.",
      );
    }
    image = await decode(jpeg);
  }
  if (!image.width || !image.height) throw new PhotoError(`${file.name} looks empty.`);

  const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height));
  const width = Math.round(image.width * scale);
  const height = Math.round(image.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("This browser couldn't prepare the photo.");
  ctx.drawImage(image.source, 0, 0, width, height);
  image.done();

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
  if (!blob) throw new PhotoError("This browser couldn't prepare the photo.");
  return { blob, width, height };
}

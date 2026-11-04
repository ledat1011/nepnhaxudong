/** The API keeps at most 2560 px on the long side (ImageProcessor.MAX_EDGE_PX), so more is never needed. */
export const MAX_LONG_SIDE = 2560;
/** The same JPEG quality as the API (ImageProcessor.JPEG_QUALITY). */
export const QUALITY = 0.85;
/** A JPEG, PNG or WebP that fits in MAX_LONG_SIDE and is not bigger than this is sent as it is. */
export const KEEP_BYTES = 2 * 1024 * 1024;

/** The types the API reads. Any other type (HEIC) is only sent when the browser cannot convert it. */
const WEB_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** A decoded picture. `close` frees its memory. */
export type Picture = { width: number; height: number; close?: () => void };

export type ShrinkDeps = {
  decode(file: File): Promise<Picture>;
  encode(picture: Picture, width: number, height: number, type: string, quality: number): Promise<Blob | null>;
};

export type ShrinkResult = { file: File; shrunk: boolean };

/** The largest size with the same aspect ratio whose long side is at most `max`. Never bigger than the picture. */
export function fitInside(width: number, height: number, max: number): { width: number; height: number } {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function renamed(name: string, type: string): string {
  const extension = type === "image/png" ? "png" : "jpg";
  const base = name.replace(/\.[^.]*$/, "");
  return `${base === "" ? "anh" : base}.${extension}`;
}

/**
 * Makes a photo smaller before it is sent, so an 8 to 12 MB phone photo takes a moment on 4G instead of minutes.
 * - The long side becomes at most 2560 px, and the aspect ratio stays.
 * - The picture is turned upright by its EXIF orientation while it is decoded, so the new file needs no EXIF.
 * - PNG stays PNG (it may be transparent). Every other type becomes JPEG at quality 0.85, on white.
 * - A small JPEG, PNG or WebP is sent as it is.
 * - When the browser cannot read or write the picture (HEIC on most browsers), the original is sent and the API answers.
 */
export async function shrinkImage(file: File, deps: ShrinkDeps = browserDeps): Promise<ShrinkResult> {
  const original: ShrinkResult = { file, shrunk: false };
  const webType = WEB_TYPES.includes(file.type);
  let picture: Picture;
  try {
    picture = await deps.decode(file);
  } catch {
    return original;
  }
  try {
    const fits = Math.max(picture.width, picture.height) <= MAX_LONG_SIDE;
    if (webType && fits && file.size <= KEEP_BYTES) return original;
    const size = fitInside(picture.width, picture.height, MAX_LONG_SIDE);
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await deps.encode(picture, size.width, size.height, type, QUALITY);
    if (blob === null) return original;
    // A file that only got bigger is not worth sending, unless the API cannot read the original type.
    if (webType && blob.size >= file.size) return original;
    return { file: new File([blob], renamed(file.name, type), { type, lastModified: file.lastModified }), shrunk: true };
  } catch {
    return original;
  } finally {
    picture.close?.();
  }
}

const browserDeps: ShrinkDeps = {
  async decode(file) {
    // "from-image" turns the picture by its EXIF orientation, as the API does.
    return createImageBitmap(file, { imageOrientation: "from-image" });
  },
  encode(picture, width, height, type, quality) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (context === null) return Promise.resolve(null);
    if (type === "image/jpeg") {
      // JPEG has no transparency: a transparent part becomes white, as on the API, not black.
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(picture as ImageBitmap, 0, 0, width, height);
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), type, quality));
  },
};

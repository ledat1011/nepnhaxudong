import { PAYLOAD_TOO_LARGE_MESSAGE } from "./errors";

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp";

const HEIC_MESSAGE = "Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG.";
const TYPE_MESSAGE = "Chỉ nhận ảnh JPEG, PNG hoặc WebP.";
const ALLOWED_TYPES = IMAGE_ACCEPT.split(",");

function isHeic(file: File): boolean {
  return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/** A Vietnamese message when the browser must not send the file, or `null` when the image is fine. */
export function checkImageFile(file: File): string | null {
  // A phone often gives a HEIC photo an empty type, so HEIC is found first, by type or by name.
  if (isHeic(file)) return HEIC_MESSAGE;
  if (file.size > MAX_IMAGE_BYTES) return PAYLOAD_TOO_LARGE_MESSAGE;
  if (!ALLOWED_TYPES.includes(file.type)) return TYPE_MESSAGE;
  return null;
}

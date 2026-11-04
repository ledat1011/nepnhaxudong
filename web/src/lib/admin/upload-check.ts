import { PAYLOAD_TOO_LARGE_MESSAGE } from "./errors";

export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
/** No `capture`: with "image/*" alone a phone offers both the camera and the gallery. */
export const IMAGE_ACCEPT = "image/*";

const NOT_IMAGE_MESSAGE = "Tệp này không phải là ảnh.";
const IMAGE_NAME = /\.(jpe?g|png|webp|gif|hei[cf]|avif|bmp)$/i;

/** A phone often gives a HEIC photo an empty type, so HEIC is found by type or by name. */
export function isHeic(file: File): boolean {
  return /^image\/hei[cf]$/i.test(file.type) || /\.hei[cf]$/i.test(file.name);
}

/**
 * Right after the user picks a file: `null` when it is an image (of any type and size), otherwise the reason.
 * A big photo is made smaller first, and a type the API does not read (HEIC) is converted by the browser or
 * sent as it is, so the API gives the reason.
 */
export function checkPickedFile(file: File): string | null {
  if (file.type.startsWith("image/") || isHeic(file) || (file.type === "" && IMAGE_NAME.test(file.name))) return null;
  return NOT_IMAGE_MESSAGE;
}

/** Just before the file is sent: the API and the proxy take at most 15 MB. */
export function checkUploadFile(file: File): string | null {
  return file.size > MAX_IMAGE_BYTES ? PAYLOAD_TOO_LARGE_MESSAGE : null;
}

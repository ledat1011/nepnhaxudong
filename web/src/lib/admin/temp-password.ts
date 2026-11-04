/** Upper and lower case letters and digits, without the look-alikes 0 O 1 l I. */
export const TEMP_PASSWORD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";

export const TEMP_PASSWORD_LENGTH = 16;

/** The API refuses a temporary password shorter than this. */
export const TEMP_PASSWORD_MIN_LENGTH = 12;

/**
 * A random temporary password. Bytes come from `crypto.getRandomValues`. A byte at or above the largest
 * multiple of the alphabet size is dropped, so every character has the same chance (no modulo bias).
 */
export function generateTempPassword(): string {
  const size = TEMP_PASSWORD_ALPHABET.length;
  const limit = Math.floor(256 / size) * size;
  let password = "";
  while (password.length < TEMP_PASSWORD_LENGTH) {
    const bytes = crypto.getRandomValues(new Uint8Array(TEMP_PASSWORD_LENGTH * 2));
    for (const byte of bytes) {
      if (byte >= limit) continue;
      password += TEMP_PASSWORD_ALPHABET[byte % size];
      if (password.length === TEMP_PASSWORD_LENGTH) break;
    }
  }
  return password;
}

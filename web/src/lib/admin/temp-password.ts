/**
 * Plain Vietnamese words without accents, from the farm and the home. A temporary password made of them is easy to
 * read aloud, to send in a chat and to type on any phone keyboard. 128 words: 7 bits per word.
 */
export const TEMP_PASSWORD_WORDS: readonly string[] = [
  "lua", "gao", "nep", "vang", "xoi", "com", "ruong", "dong", "mua", "gat", "cay", "hat", "bong", "la", "nang", "gio",
  "trang", "sao", "may", "suong", "song", "ao", "cau", "nha", "san", "bep", "noi", "nia", "thung", "bao", "tui", "que",
  "xom", "lang", "cho", "duong", "cong", "ngo", "vuon", "hoa", "sen", "cuc", "dao", "mai", "tre", "truc", "thong", "me",
  "cam", "buoi", "chuoi", "mit", "nhan", "vai", "khe", "dua", "bi", "bau", "muop", "rau", "dau", "lac", "vung", "che",
  "banh", "keo", "mat", "ong", "ga", "vit", "ca", "tom", "cua", "oc", "trau", "bo", "meo", "ngua", "de", "tho",
  "chim", "cuoc", "liem", "bua", "thuyen", "cheo", "luoi", "nom", "ro", "mam", "bat", "thia", "coi", "chay", "sang", "chieu",
  "toi", "xuan", "ha", "thu", "tet", "hoi", "dinh", "chua", "den", "sach", "but", "giay", "muc", "tranh", "dan", "trong",
  "ngoc", "bac", "doi", "nui", "suoi", "bien", "dat", "da", "cat", "soi", "go", "tro", "khoi", "rom", "ra", "thoc",
];

const WORD_COUNT = 4;

/** The API refuses a temporary password shorter than this. Four words, three dashes and two digits are at least 13. */
export const TEMP_PASSWORD_MIN_LENGTH = 12;

/**
 * A random whole number from 0 to n - 1, from `crypto.getRandomValues`. A value at or above the largest multiple of n
 * is dropped, so every number has the same chance (no modulo bias).
 */
export function randomBelow(n: number): number {
  const limit = Math.floor(2 ** 32 / n) * n;
  const box = new Uint32Array(1);
  for (;;) {
    crypto.getRandomValues(box);
    if (box[0] < limit) return box[0] % n;
  }
}

/**
 * A random temporary password such as "lua-vang-mua-gat-27": four words and a number from 10 to 99, about 34 bits.
 * It is used once: the person must change it at the first sign-in, and the API limits failed sign-ins.
 */
export function generateTempPassword(): string {
  const words = Array.from({ length: WORD_COUNT }, () => TEMP_PASSWORD_WORDS[randomBelow(TEMP_PASSWORD_WORDS.length)]);
  return [...words, String(10 + randomBelow(90))].join("-");
}

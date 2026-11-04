import type { LocalizedText } from "./types";

function trimmedOrNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed === "" ? null : trimmed;
}

/** The text as the API wants it: trimmed on both sides, and a blank value is `null`, never "". */
export function toRequestText(text: LocalizedText): LocalizedText {
  return { vi: trimmedOrNull(text.vi), en: trimmedOrNull(text.en) };
}

/** Rule R12: the English text is missing only when the Vietnamese text has words and the English one is blank. */
export function isMissingEn(text: LocalizedText): boolean {
  return trimmedOrNull(text.vi) !== null && trimmedOrNull(text.en) === null;
}

import { LANGS, type Lang } from "@/lib/i18n/langs";
import { storyPath } from "@/lib/i18n/routes";
import type { StoryDetail } from "./types";

/**
 * Reads the `?page` query value. No value is the first page (0).
 * Returns null for anything that is not a non-negative integer (the page then answers 404).
 */
export function parsePage(value: string | string[] | undefined): number | null {
  if (value === undefined) return 0;
  if (typeof value !== "string" || !/^\d+$/.test(value)) return null;
  const page = Number(value);
  return Number.isSafeInteger(page) ? page : null;
}

/** Path of one story in both languages. A story without its own slug in the other language keeps its slug. */
export function storyAlternates(lang: Lang, story: StoryDetail): Record<Lang, string> {
  const paths = {} as Record<Lang, string>;
  for (const code of LANGS) {
    const slug = code === lang ? story.slug : (story.alternateSlug ?? story.slug);
    paths[code] = storyPath(code, slug);
  }
  return paths;
}

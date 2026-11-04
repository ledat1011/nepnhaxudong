import { LANGS, type Lang } from "@/lib/i18n/langs";
import { storyPath } from "@/lib/i18n/routes";
import { STORIES_PAGE_SIZE } from "./tags";
import type { ContentClient, StoryDetail, StorySummary } from "./types";

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

/**
 * Whether a page follows this one. A full page may be the last one (when the total is an exact
 * multiple of the page size), so the next page is asked for; that call is cached by tag.
 */
export async function hasNextPage(
  client: ContentClient,
  lang: Lang,
  page: number,
  items: StorySummary[],
): Promise<boolean> {
  if (items.length < STORIES_PAGE_SIZE) return false;
  return (await client.getStories(lang, page + 1)).length > 0;
}

import type { Lang } from "./langs";

export const STORY_SECTION: Record<Lang, string> = {
  vi: "cau-chuyen",
  en: "stories",
};

/** Anchor ids of the home page sections, shared by both languages. */
export const SECTION_IDS = [
  "san-pham",
  "hanh-trinh",
  "bao-chi",
  "cau-chuyen",
  "lien-he",
] as const;

export function homePath(lang: Lang): string {
  return `/${lang}`;
}

export function storiesPath(lang: Lang, page = 0): string {
  const base = `/${lang}/${STORY_SECTION[lang]}`;
  return page > 0 ? `${base}?page=${page}` : base;
}

export function storyPath(lang: Lang, slug: string): string {
  return `${storiesPath(lang)}/${slug}`;
}

export function isStorySection(lang: Lang, section: string): boolean {
  return STORY_SECTION[lang] === section;
}

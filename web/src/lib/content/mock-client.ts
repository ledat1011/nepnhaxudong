import homeVi from "@/fixtures/home.vi.json";
import homeEn from "@/fixtures/home.en.json";
import storiesVi from "@/fixtures/stories.vi.json";
import storiesEn from "@/fixtures/stories.en.json";
import type { Lang } from "@/lib/i18n/langs";
import { STORIES_PAGE_SIZE } from "./tags";
import type {
  ContentClient,
  HomeData,
  StoryDetail,
  StorySummary,
} from "./types";

const HOME_STORY_COUNT = 3;

// Typed (no casts), so the compiler checks the fixtures against the contract types.
const HOME: Record<Lang, Omit<HomeData, "stories">> = {
  vi: { ...homeVi, lang: "vi" },
  en: { ...homeEn, lang: "en" },
};
const STORIES: Record<Lang, StoryDetail[]> = {
  vi: storiesVi,
  en: storiesEn,
};

function newestFirst(lang: Lang): StoryDetail[] {
  return [...STORIES[lang]].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  );
}

function toSummary(story: StoryDetail): StorySummary {
  const { slug, title, excerpt, publishedAt, cover } = story;
  return { slug, title, excerpt, publishedAt, cover };
}

export function createMockClient(): ContentClient {
  return {
    async getHome(lang) {
      return {
        ...HOME[lang],
        stories: newestFirst(lang).slice(0, HOME_STORY_COUNT).map(toSummary),
      };
    },

    // `page` is 0-based, like the API.
    async getStories(lang, page) {
      if (!Number.isInteger(page) || page < 0) return [];
      const start = page * STORIES_PAGE_SIZE;
      return newestFirst(lang)
        .slice(start, start + STORIES_PAGE_SIZE)
        .map(toSummary);
    },

    // Looks only at the fixture of that language. A story without its own EN
    // slug is already listed in the EN fixture under its VI slug, like the API.
    async getStory(lang, slug) {
      return STORIES[lang].find((s) => s.slug === slug) ?? null;
    },
  };
}

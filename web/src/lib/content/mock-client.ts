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

const HOME = { vi: homeVi, en: homeEn } as unknown as Record<
  Lang,
  Omit<HomeData, "stories">
>;
const STORIES = { vi: storiesVi, en: storiesEn } as unknown as Record<
  Lang,
  StoryDetail[]
>;

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

    async getStories(lang, page) {
      const start = (page - 1) * STORIES_PAGE_SIZE;
      return newestFirst(lang)
        .slice(start, start + STORIES_PAGE_SIZE)
        .map(toSummary);
    },

    async getStory(lang, slug) {
      const own = STORIES[lang].find((s) => s.slug === slug);
      if (own) return own;
      // Like the API: English falls back to the Vietnamese slug.
      if (lang === "en") return STORIES.vi.find((s) => s.slug === slug) ?? null;
      return null;
    },
  };
}

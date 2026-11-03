import { describe, expect, it } from "vitest";
import { STORIES_PAGE_SIZE } from "@/lib/content/tags";
import type { ContentClient, StoryDetail, StorySummary } from "@/lib/content/types";
import type { Lang } from "@/lib/i18n/langs";
import { buildSitemapEntries } from "./sitemap-entries";

const SITE = new URL("https://x.vn");
const FIXED_PAGES = 4;

function summary(slug: string): StorySummary {
  return { slug, title: slug, excerpt: "", publishedAt: "2026-04-10T02:00:00Z", cover: null };
}

function fakeClient(
  stories: Record<Lang, StorySummary[]>,
  alternates: Record<string, string> = {},
): ContentClient {
  return {
    getHome: async () => {
      throw new Error("not needed");
    },
    getStories: async (lang, page) =>
      stories[lang].slice(page * STORIES_PAGE_SIZE, (page + 1) * STORIES_PAGE_SIZE),
    getStory: async (lang, slug): Promise<StoryDetail | null> => {
      const found = stories[lang].find((item) => item.slug === slug);
      return found
        ? { ...found, bodyHtml: "", alternateSlug: alternates[`${lang}:${slug}`] ?? null }
        : null;
    },
  };
}

function viStoryUrls(urls: string[]): string[] {
  return urls.filter((url) => url.includes("/vi/cau-chuyen/"));
}

describe("buildSitemapEntries", () => {
  it("lists the home and story list pages of both languages", async () => {
    const entries = await buildSitemapEntries(fakeClient({ vi: [], en: [] }), SITE);
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://x.vn/vi",
      "https://x.vn/en",
      "https://x.vn/vi/cau-chuyen",
      "https://x.vn/en/stories",
    ]);
    expect(entries[0].alternates?.languages).toEqual({
      vi: "https://x.vn/vi",
      en: "https://x.vn/en",
      "x-default": "https://x.vn/vi",
    });
  });

  it("lists each story in both languages with alternates and lastModified", async () => {
    const client = fakeClient(
      { vi: [summary("bai-mot")], en: [summary("post-one")] },
      { "vi:bai-mot": "post-one", "en:post-one": "bai-mot" },
    );
    const stories = (await buildSitemapEntries(client, SITE)).slice(FIXED_PAGES);
    expect(stories.map((entry) => entry.url)).toEqual([
      "https://x.vn/vi/cau-chuyen/bai-mot",
      "https://x.vn/en/stories/post-one",
    ]);
    expect(stories[0].lastModified).toBe("2026-04-10T02:00:00Z");
    expect(stories[0].alternates?.languages).toEqual({
      vi: "https://x.vn/vi/cau-chuyen/bai-mot",
      en: "https://x.vn/en/stories/post-one",
      "x-default": "https://x.vn/vi/cau-chuyen/bai-mot",
    });
  });

  it("reads every page of stories", async () => {
    const many = Array.from({ length: STORIES_PAGE_SIZE + 3 }, (_, i) => summary(`s-${i}`));
    const entries = await buildSitemapEntries(fakeClient({ vi: many, en: [] }), SITE);
    expect(viStoryUrls(entries.map((entry) => entry.url))).toHaveLength(many.length);
  });

  it("stops after the last page when the total is an exact multiple of the page size", async () => {
    const exact = Array.from({ length: STORIES_PAGE_SIZE }, (_, i) => summary(`s-${i}`));
    const entries = await buildSitemapEntries(fakeClient({ vi: exact, en: [] }), SITE);
    expect(viStoryUrls(entries.map((entry) => entry.url))).toHaveLength(exact.length);
  });
});

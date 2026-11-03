import type { MetadataRoute } from "next";
import { storyAlternates } from "@/lib/content/story-routing";
import { STORIES_PAGE_SIZE } from "@/lib/content/tags";
import type { ContentClient, StorySummary } from "@/lib/content/types";
import { LANGS, type Lang } from "@/lib/i18n/langs";
import { homePath, storiesPath } from "@/lib/i18n/routes";

type Entry = MetadataRoute.Sitemap[number];

// Stops a faulty API that keeps answering full pages.
const MAX_STORY_PAGES = 500;
// How many story details are read at the same time.
const DETAIL_BATCH_SIZE = 10;

function pathsOf(pathFor: (lang: Lang) => string): Record<Lang, string> {
  return Object.fromEntries(LANGS.map((lang) => [lang, pathFor(lang)])) as Record<Lang, string>;
}

function languageUrls(paths: Record<Lang, string>, siteUrl: URL): Record<string, string> {
  const urls = pathsOf((lang) => new URL(paths[lang], siteUrl).href);
  return { ...urls, "x-default": urls.vi };
}

function pageEntries(siteUrl: URL): Entry[] {
  const groups = [pathsOf(homePath), pathsOf((lang) => storiesPath(lang))];
  return groups.flatMap((paths) =>
    LANGS.map((lang) => ({
      url: new URL(paths[lang], siteUrl).href,
      alternates: { languages: languageUrls(paths, siteUrl) },
    })),
  );
}

async function allStories(client: ContentClient, lang: Lang): Promise<StorySummary[]> {
  const stories: StorySummary[] = [];
  for (let page = 0; page < MAX_STORY_PAGES; page++) {
    const items = await client.getStories(lang, page);
    stories.push(...items);
    if (items.length < STORIES_PAGE_SIZE) break;
  }
  return stories;
}

// The other-language slug is only in the story detail; the detail calls are cached by tag.
async function storyEntries(client: ContentClient, lang: Lang, siteUrl: URL): Promise<Entry[]> {
  const summaries = await allStories(client, lang);
  const entries: Entry[] = [];
  for (let start = 0; start < summaries.length; start += DETAIL_BATCH_SIZE) {
    const batch = summaries.slice(start, start + DETAIL_BATCH_SIZE);
    const details = await Promise.all(batch.map((item) => client.getStory(lang, item.slug)));
    batch.forEach((item, index) => {
      const detail = details[index] ?? { ...item, bodyHtml: "", alternateSlug: null };
      const paths = storyAlternates(lang, detail);
      entries.push({
        url: new URL(paths[lang], siteUrl).href,
        lastModified: item.publishedAt,
        alternates: { languages: languageUrls(paths, siteUrl) },
      });
    });
  }
  return entries;
}

export async function buildSitemapEntries(client: ContentClient, siteUrl: URL): Promise<Entry[]> {
  const stories = await Promise.all(LANGS.map((lang) => storyEntries(client, lang, siteUrl)));
  return [...pageEntries(siteUrl), ...stories.flat()];
}

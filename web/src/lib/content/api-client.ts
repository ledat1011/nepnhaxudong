import type { Lang } from "@/lib/i18n/langs";
import { ContentUnavailableError } from "./client";
import { TAG_HOME, TAG_STORIES, storyTag } from "./tags";
import type {
  ContentClient,
  HomeData,
  StoryDetail,
  StorySummary,
} from "./types";

const TIMEOUT_MS = 5000;

type FetchFn = typeof fetch;

export function createApiClient(
  baseUrl: string,
  fetchFn: FetchFn = fetch,
): ContentClient {
  async function request(path: string, tags: string[]): Promise<Response> {
    const url = `${baseUrl}/api/public/${path}`;
    try {
      return await fetchFn(url, {
        cache: "force-cache",
        signal: AbortSignal.timeout(TIMEOUT_MS),
        next: { tags },
      });
    } catch (cause) {
      throw new ContentUnavailableError(`Request failed: ${url}`, { cause });
    }
  }

  async function readJson<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw new ContentUnavailableError(
        `Content API answered ${response.status} for ${response.url}`,
      );
    }
    try {
      return (await response.json()) as T;
    } catch (cause) {
      throw new ContentUnavailableError("Content API sent invalid JSON", {
        cause,
      });
    }
  }

  return {
    async getHome(lang: Lang): Promise<HomeData> {
      return readJson<HomeData>(await request(`${lang}/home`, [TAG_HOME]));
    },

    async getStories(lang: Lang, page: number): Promise<StorySummary[]> {
      return readJson<StorySummary[]>(
        await request(`${lang}/stories?page=${page}`, [TAG_STORIES]),
      );
    },

    async getStory(lang: Lang, slug: string): Promise<StoryDetail | null> {
      const response = await request(
        `${lang}/stories/${encodeURIComponent(slug)}`,
        [TAG_STORIES, storyTag(slug)],
      );
      if (response.status === 404) return null;
      return readJson<StoryDetail>(response);
    },
  };
}

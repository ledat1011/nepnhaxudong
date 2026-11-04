import type { ContentClient } from "@/lib/content/types";
import { hasNextPage } from "@/lib/content/story-routing";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";
import { Pagination } from "./Pagination";
import { StoryCard } from "./StoryCard";

/** Grid of the story list. The loading skeleton uses it too, so both have the same columns. */
export const STORY_GRID_CLASS = "grid gap-6 sm:grid-cols-2 lg:grid-cols-3";

type StoryListProps = {
  lang: Lang;
  dict: Dictionary;
  /** 0-based page number. */
  page: number;
  client: ContentClient;
};

/**
 * The cards and the page links of one story list page. It loads its own data, so the list
 * page can show `StoryListSkeleton` in a Suspense boundary while it waits.
 */
export async function StoryList({ lang, dict, page, client }: StoryListProps) {
  const stories = await client.getStories(lang, page);
  const hasNext = await hasNextPage(client, lang, page, stories);

  return (
    <>
      {stories.length === 0 ? (
        <p className="text-lg">{dict.stories.empty}</p>
      ) : (
        <ul className={STORY_GRID_CLASS}>
          {stories.map((story) => (
            <li key={story.slug}>
              <StoryCard lang={lang} story={story} dict={dict} headingLevel={2} />
            </li>
          ))}
        </ul>
      )}
      <Pagination lang={lang} page={page} hasNext={hasNext} dict={dict} />
    </>
  );
}

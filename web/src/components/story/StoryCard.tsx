import Link from "next/link";
import { ContentImage } from "@/components/ui/ContentImage";
import { LinkPendingStatus } from "@/components/ui/LinkPendingStatus";
import type { StorySummary } from "@/lib/content/types";
import { formatDate } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";
import { storyPath } from "@/lib/i18n/routes";

type StoryCardProps = {
  lang: Lang;
  story: StorySummary;
  dict: Dictionary;
  /** Heading level of the title: 3 under the home page h2, 2 under the list page h1. */
  headingLevel?: 2 | 3;
};

/** Frame of a story card. The loading skeleton uses it too, so both have the same size. */
export const STORY_CARD_CLASS =
  "group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-grain bg-rice has-[a:hover]:border-coat";

/** Text classes of the card. The skeleton draws its lines with the same classes and line heights. */
export const STORY_CARD_TEXT = {
  date: "text-sm font-bold text-coat",
  title: "text-xl font-bold leading-snug",
  excerpt: "leading-relaxed",
  readMore: "mt-auto pt-2 font-bold text-coat",
} as const;

/** Card for the home page and the story list. The title link covers the whole card. */
export function StoryCard({ lang, story, dict, headingLevel = 3 }: StoryCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className={STORY_CARD_CLASS}>
      <div className="aspect-[16/9] overflow-hidden">
        <ContentImage
          image={story.cover}
          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
          placeholderLabel={dict.image.placeholder}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <time dateTime={story.publishedAt} className={STORY_CARD_TEXT.date}>
          {formatDate(story.publishedAt, lang)}
        </time>
        <Heading className={STORY_CARD_TEXT.title}>
          <Link
            href={storyPath(lang, story.slug)}
            className="rounded after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
          >
            {story.title}
            <LinkPendingStatus label={dict.loading.page} />
          </Link>
        </Heading>
        <p className={STORY_CARD_TEXT.excerpt}>{story.excerpt}</p>
        <p aria-hidden="true" className={STORY_CARD_TEXT.readMore}>
          {dict.stories.readMore} →
        </p>
      </div>
    </article>
  );
}

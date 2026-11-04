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

/** Card for the home page and the story list. The title link covers the whole card. */
export function StoryCard({ lang, story, dict, headingLevel = 3 }: StoryCardProps) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border-2 border-grain bg-rice has-[a:hover]:border-coat">
      <div className="aspect-[16/9] overflow-hidden">
        <ContentImage
          image={story.cover}
          sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
          placeholderLabel={dict.image.placeholder}
          className="h-full w-full object-cover"
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 p-5">
        <time dateTime={story.publishedAt} className="text-sm font-bold text-coat">
          {formatDate(story.publishedAt, lang)}
        </time>
        <Heading className="text-xl font-bold leading-snug">
          <Link
            href={storyPath(lang, story.slug)}
            className="rounded after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
          >
            {story.title}
            <LinkPendingStatus label={dict.loading.page} />
          </Link>
        </Heading>
        <p className="leading-relaxed">{story.excerpt}</p>
        <p aria-hidden="true" className="mt-auto pt-2 font-bold text-coat">
          {dict.stories.readMore} →
        </p>
      </div>
    </article>
  );
}

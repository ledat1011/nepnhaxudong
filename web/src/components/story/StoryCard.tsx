import Link from "next/link";
import { ContentImage } from "@/components/ui/ContentImage";
import type { StorySummary } from "@/lib/content/types";
import { formatDate } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";
import { storyPath } from "@/lib/i18n/routes";

type StoryCardProps = {
  lang: Lang;
  story: StorySummary;
  dict: Dictionary;
};

/** Card for the home page and the story list. The title link covers the whole card. */
export function StoryCard({ lang, story, dict }: StoryCardProps) {
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
        <h3 className="text-xl font-bold leading-snug">
          <Link
            href={storyPath(lang, story.slug)}
            className="rounded after:absolute after:inset-0 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
          >
            {story.title}
          </Link>
        </h3>
        <p className="leading-relaxed">{story.excerpt}</p>
        <p aria-hidden="true" className="mt-auto pt-2 font-bold text-coat">
          {dict.stories.readMore} →
        </p>
      </div>
    </article>
  );
}

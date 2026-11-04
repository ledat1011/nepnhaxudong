import Link from "next/link";
import { StoryCard } from "@/components/story/StoryCard";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { StorySummary } from "@/lib/content/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";
import { storiesPath } from "@/lib/i18n/routes";

type StoriesSectionProps = {
  lang: Lang;
  dict: Dictionary;
  stories: StorySummary[];
};

const MAX_STORIES = 3;

export function StoriesSection({ lang, dict, stories }: StoriesSectionProps) {
  return (
    <section aria-labelledby="cau-chuyen" className="bg-straw">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <SectionHeading id="cau-chuyen" title={dict.sections.story} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stories.slice(0, MAX_STORIES).map((story) => (
            <li key={story.slug} data-reveal>
              <StoryCard lang={lang} story={story} dict={dict} />
            </li>
          ))}
        </ul>
        <div className="mt-10 text-center">
          <Link
            href={storiesPath(lang)}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-coat px-6 py-2 font-bold text-rice underline-offset-4 hover:underline hover:bg-earth focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
          >
            {dict.stories.viewAll}
          </Link>
        </div>
      </div>
    </section>
  );
}

import { ContentImage } from "@/components/ui/ContentImage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { PressMention } from "@/lib/content/types";
import { formatDate } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";

type PressSectionProps = {
  lang: Lang;
  dict: Dictionary;
  items: PressMention[];
};

/**
 * Press articles as cards that open the article in a new tab. With one article, a card in the
 * grid would leave two thirds of the row empty, so from `md` that card lies across the full
 * width: the picture on the left, the text on the right.
 */
export function PressSection({ lang, dict, items }: PressSectionProps) {
  const single = items.length === 1;
  return (
    <section aria-labelledby="bao-chi">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <SectionHeading id="bao-chi" title={dict.sections.press} />
        <ul className={single ? "" : "grid gap-6 sm:grid-cols-2 lg:grid-cols-3"}>
          {items.map((item) => (
            <li key={item.url} data-reveal>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-straw bg-rice hover:border-coat focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat ${
                  single ? "md:flex-row" : ""
                }`}
              >
                <div className={`aspect-[16/9] shrink-0 overflow-hidden ${single ? "md:w-3/5" : ""}`}>
                  <ContentImage
                    image={item.image}
                    sizes={
                      single
                        ? "(min-width: 1152px) 41rem, (min-width: 768px) 60vw, 100vw"
                        : "(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
                    }
                    placeholderLabel={dict.image.placeholder}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div
                  className={`flex flex-1 flex-col gap-2 p-5 ${single ? "md:justify-center md:gap-3 md:p-8" : ""}`}
                >
                  <p className="text-sm font-bold text-coat">{item.sourceName}</p>
                  <p
                    className={`font-bold leading-snug group-hover:underline ${
                      single ? "text-lg text-balance md:text-2xl" : "text-lg"
                    }`}
                  >
                    {item.title}
                  </p>
                  {item.publishedOn !== null && (
                    <time dateTime={item.publishedOn} className="text-sm font-medium">
                      {formatDate(item.publishedOn, lang)}
                    </time>
                  )}
                  <p className={`font-bold text-coat ${single ? "pt-2" : "mt-auto pt-2"}`}>
                    {dict.press.open} <span aria-hidden="true">↗</span>
                    <span className="sr-only"> {dict.press.newTab}</span>
                  </p>
                </div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

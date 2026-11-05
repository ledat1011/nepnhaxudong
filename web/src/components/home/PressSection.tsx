import { ContentImage } from "@/components/ui/ContentImage";
import { ExternalLink } from "@/components/ui/ExternalLink";
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

export function PressSection({ lang, dict, items }: PressSectionProps) {
  return (
    <section aria-labelledby="bao-chi">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <SectionHeading id="bao-chi" title={dict.sections.press} />
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li key={item.url} data-reveal>
              <ExternalLink
                href={item.url}
                newTabLabel={dict.link.newTab}
                className="group flex h-full flex-col overflow-hidden rounded-2xl border-2 border-straw bg-rice hover:border-coat focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat"
              >
                {item.image !== null && (
                  <div data-press-photo className="aspect-[16/9] overflow-hidden">
                    <ContentImage
                      image={item.image}
                      sizes="(min-width: 1024px) 24rem, (min-width: 640px) 50vw, 100vw"
                      placeholderLabel={dict.image.placeholder}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-1 flex-col gap-2 p-5">
                  <p className="text-sm font-bold text-coat">
                    {item.sourceName}
                  </p>
                  <p className="text-lg font-bold leading-snug text-balance group-hover:underline">
                    {item.title}
                  </p>
                  {item.publishedOn !== null && (
                    <time dateTime={item.publishedOn} className="mt-auto pt-2 text-sm font-medium">
                      {formatDate(item.publishedOn, lang)}
                    </time>
                  )}
                </div>
              </ExternalLink>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

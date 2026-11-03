import { ContentImage } from "@/components/ui/ContentImage";
import { SectionHeading } from "@/components/ui/SectionHeading";
import type { TimelineEvent } from "@/lib/content/types";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type JourneySectionProps = {
  dict: Dictionary;
  events: TimelineEvent[];
};

/**
 * Vertical timeline. `data-journey-line` and `data-journey-event` are hooks for the
 * later rice-plant animation, which replaces the plain line.
 */
export function JourneySection({ dict, events }: JourneySectionProps) {
  return (
    <section aria-labelledby="hanh-trinh" className="bg-straw">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <SectionHeading id="hanh-trinh" title={dict.sections.journey} />
        <div className="relative">
          <div
            data-journey-line
            aria-hidden="true"
            className="absolute bottom-0 left-[14px] top-2 w-1 rounded-full bg-grain md:left-1/2 md:-translate-x-1/2"
          />
          <ol>
            {events.map((event, i) => {
              const onLeft = i % 2 === 0;
              return (
                <li
                  key={`${event.year}-${event.title}`}
                  data-journey-event
                  className={`relative pb-12 pl-12 last:pb-0 md:w-1/2 md:pb-16 ${
                    onLeft ? "md:pl-0 md:pr-12" : "md:ml-auto md:pl-12"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 top-1 h-8 w-8 rounded-full border-4 border-straw bg-earth ${
                      onLeft ? "md:left-auto md:right-0 md:translate-x-1/2" : "md:-translate-x-1/2"
                    }`}
                  />
                  <p className="text-xl font-bold text-coat">{event.year}</p>
                  <h3 className="mt-1 text-xl font-bold">{event.title}</h3>
                  <p className="mt-2 leading-relaxed">{event.description}</p>
                  <div className="mt-4 aspect-[4/3] max-w-sm overflow-hidden rounded-2xl border-2 border-grain">
                    <ContentImage
                      image={event.image}
                      sizes="(min-width: 768px) 24rem, 80vw"
                      placeholderLabel={dict.image.placeholder}
                      className="h-full w-full object-cover"
                    />
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}

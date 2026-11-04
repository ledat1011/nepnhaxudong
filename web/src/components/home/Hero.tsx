import Link from "next/link";
import { FieldBackdrop } from "@/components/brand/FieldBackdrop";
import { Mascot } from "@/components/brand/Mascot";
import { ZaloLink } from "@/components/contact/ZaloLink";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";
import { homePath } from "@/lib/i18n/routes";

type HeroProps = {
  lang: Lang;
  dict: Dictionary;
  tagline: string;
  zalo: string | null;
  /** Whether the page has a journey section to link to. */
  hasJourney: boolean;
};

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full px-6 py-2 font-bold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";

/** First screen. The largest element is the brand text, so the LCP is text, not an image. */
export function Hero({ lang, dict, tagline, zalo, hasJourney }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-rice">
      <div className="mx-auto grid max-w-6xl items-center gap-6 px-4 pb-36 pt-10 md:grid-cols-2 md:gap-10 md:pb-44 md:pt-16">
        <div className="order-2 text-center md:order-1 md:text-left">
          <h1 className="font-display text-6xl leading-[1.3] text-earth md:text-7xl">{dict.site.name}</h1>
          <p className="mx-auto mt-4 max-w-md text-lg font-medium md:mx-0 md:text-xl">{tagline}</p>
          {(zalo !== null || hasJourney) && (
            <div className="mt-8 flex flex-wrap justify-center gap-3 md:justify-start">
              {zalo !== null && (
                <ZaloLink
                  zalo={zalo}
                  labels={dict.zalo}
                  className={`${BUTTON_CLASS} bg-coat text-rice hover:bg-earth`}
                >
                  {dict.hero.zaloCta}
                </ZaloLink>
              )}
              {hasJourney && (
                <Link
                  href={`${homePath(lang)}#hanh-trinh`}
                  className={`${BUTTON_CLASS} border-2 border-coat text-earth hover:bg-straw`}
                >
                  {dict.hero.journeyCta}
                </Link>
              )}
            </div>
          )}
        </div>
        <div className="order-1 mx-auto w-40 md:order-2 md:w-72" aria-hidden="true">
          <Mascot title={dict.site.name} className="h-auto w-full" />
        </div>
      </div>
      <FieldBackdrop className="pointer-events-none absolute inset-x-0 bottom-0 h-28 w-full md:h-40" />
    </section>
  );
}

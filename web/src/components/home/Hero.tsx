import Link from "next/link";
import { Mascot } from "@/components/brand/Mascot";
import { ZaloLink } from "@/components/contact/ZaloLink";
import { MotionPauseButton } from "@/components/motion/MotionPauseButton";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import type { Lang } from "@/lib/i18n/langs";
import { homePath } from "@/lib/i18n/routes";
import { HeroField, HeroSky, HeroSun } from "./HeroScene";

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

/**
 * First screen. The largest element is the brand text, so the LCP is text, not an image.
 *
 * The illustrated scene (sky, clouds, village, field) is a panel: on a phone the top band of the
 * hero, behind the mascot; from `md` the full hero width, behind the text and the mascot. It is
 * clearest behind the mascot and fades toward the left edge (at most 30 % over the text column,
 * so the text keeps its contrast) and toward the bottom (`hero-fade-*` in globals.css).
 * `--hero-m` is the mascot width; the mascot stands on the bottom of the panel, and the field is
 * sized from `--hero-m` so that its horizon is at the mascot's waist (HeroScene.tsx).
 *
 * Layers, back to front: panel (z-0), sun (z-1), text and mascot (z-2), pause button (z-10).
 * The section is `isolate`, so these z values stay inside the hero.
 *
 * The pause button sits in the bottom-right corner of the moving scene: on a phone that is the
 * top band (the panel is `2.5rem + --hero-m` high, the button 2.75rem, so its top is 3.5rem above
 * the panel bottom), right of the centered mascot and above the text; from `md` it is the
 * bottom-right corner of the hero.
 */
export function Hero({ lang, dict, tagline, zalo, hasJourney }: HeroProps) {
  return (
    <section
      data-hero-scene=""
      className="relative isolate overflow-hidden bg-rice [--hero-m:11rem] md:[--hero-m:18rem] lg:[--hero-m:20rem]"
    >
      <div
        data-hero-panel=""
        aria-hidden="true"
        className="hero-fade-side pointer-events-none absolute inset-x-0 top-0 z-0 h-[calc(2.5rem+var(--hero-m))] md:inset-y-0 md:h-auto"
      >
        <div className="hero-fade-bottom absolute inset-0 bg-linear-to-b from-sky from-0% via-sky-light via-50% to-rice to-95%">
          <HeroSky />
          <HeroField />
        </div>
      </div>
      <div className="relative mx-auto grid max-w-6xl gap-6 px-4 pt-10 pb-16 md:grid-cols-2 md:items-center md:gap-10 md:pt-16 md:pb-0">
        <div className="relative z-[2] order-2 text-center md:order-1 md:py-16 md:text-left">
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
        <div className="relative order-1 mx-auto w-(--hero-m) md:order-2 md:self-end" aria-hidden="true">
          <HeroSun />
          <Mascot title={dict.site.name} className="hero-fade-mascot relative z-[2] block h-auto w-full" />
        </div>
      </div>
      <div
        data-hero-pause=""
        className="absolute top-[calc(2.5rem+var(--hero-m)-3.5rem)] right-4 z-10 md:top-auto md:bottom-4"
      >
        <MotionPauseButton dict={dict} />
      </div>
    </section>
  );
}

import { ZaloLink } from "@/components/contact/ZaloLink";
import { RiceGrain } from "@/components/home/RicePlant";
import { MotionPauseButton } from "@/components/motion/MotionPauseButton";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { BRAND } from "@/lib/brand/colors";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { roadBend, roadPath } from "@/lib/story/road";
import { STORY_SCENES, type SceneSlug } from "@/lib/story/scenes";

type RiceStoryProps = {
  dict: Dictionary;
  zalo: string | null;
};

/** Dictionary key prefix of each scene (camelCase of the slug). */
const KEYS: Record<SceneSlug, string> = {
  "cay-ma": "cayMa",
  "nang-mua-gio": "nangMuaGio",
  gat: "gat",
  say: "say",
  "xay-xat": "xayXat",
  "dong-goi": "dongGoi",
  "den-tay-khach": "denTayKhach",
  "mam-com": "mamCom",
};

const BUTTON_CLASS =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-coat px-6 py-2 font-bold text-rice underline-offset-4 hover:bg-earth hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";

function sceneText(dict: Dictionary, slug: SceneSlug): { title: string; text: string } {
  const story: Record<string, string> = dict.story;
  const key = KEYS[slug];
  return { title: story[`${key}Title`], text: story[`${key}Text`] };
}

/** Where the road runs: 20 px from the left below 768 px, the middle of the list from 768 px. */
const ON_ROAD_LEFT = "md:left-auto md:right-0 md:translate-x-1/2";
const ON_ROAD_RIGHT = "md:left-0";

type StretchProps = { bend: number; edge: string; middle: string };

/** One stretch of the road, stretched to the box; the strokes keep their width in pixels. */
function Stretch({ bend, edge, middle }: StretchProps) {
  const d = roadPath(bend);
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      focusable="false"
      fill="none"
      strokeLinecap="round"
      className="absolute inset-0 h-full w-full overflow-visible"
    >
      <path d={d} stroke={BRAND.coat} vectorEffect="non-scaling-stroke" className={edge} />
      <path d={d} stroke={BRAND.straw} vectorEffect="non-scaling-stroke" className={middle} />
    </svg>
  );
}

/**
 * From 768 px a scene starts this far above the end of the one before, so it starts beside the
 * text of the scene before. A scene there is about 400 px high, so the stops on the road are
 * about 340 px apart (the owner found 10rem, 250 px apart, too close). Its road stretch ends
 * this much higher too, at the next scene's stop, so the stretches still join without a gap or
 * a double line. The class names are written in full for Tailwind.
 */
const OVERLAP_SCENE = "md:-mt-16";
const OVERLAP_ROAD = "md:h-[calc(100%-4rem)]";

/**
 * The eight scenes from the seedling to the table, as one vertical timeline along a winding
 * dirt road: below 768 px the road runs on the left and the scenes stand to its right; from
 * 768 px it runs down the middle and the scenes take turns left and right, and each scene
 * starts `OVERLAP_SCENE` above the end of the one before, so the two columns fill each other's gaps
 * instead of leaving half the width empty. Each scene draws
 * its own stretch of road down to the next stop, so the stops always sit on the road. The
 * static markup is complete: the whole road is drawn and every drawing shows its final frame.
 * The motion code (lib/motion/story/rice-story.ts) moves the grain down the road, darkens the
 * part already passed and fills the stop of the scene in view, through the `data-story-*`
 * hooks.
 */
export function RiceStory({ dict, zalo }: RiceStoryProps) {
  return (
    <section aria-labelledby="tu-hat-lua" data-rice-story className="overflow-x-clip bg-rice">
      <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
        <div className="relative">
          <SectionHeading id="tu-hat-lua" title={dict.story.title} />
          <a
            href="#sau-cau-chuyen"
            data-story-skip
            className="sr-only focus:not-sr-only focus:mb-6 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-coat focus:px-6 focus:text-rice focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-earth"
          >
            {dict.story.skip}
          </a>
          {/*
            Out of the flow, so it moves nothing when it shows. Below md the heading can reach the
            right edge, so the button sits in the section's top padding; from md, on the heading line.
          */}
          <div data-story-pause="" className="absolute -top-13 right-0 md:-top-0.5">
            <MotionPauseButton dict={dict} />
          </div>
        </div>
        <div data-story-road-wrap className="relative">
          <span
            data-story-grain
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 z-20 opacity-0"
          >
            <RiceGrain className="block" />
          </span>
          <ol data-story-list role="list">
            {STORY_SCENES.map((scene, i) => {
              const { title, text } = sceneText(dict, scene.slug);
              const isLast = i === STORY_SCENES.length - 1;
              const onLeft = i % 2 === 0;
              const bend = roadBend(i);
              const side = onLeft ? ON_ROAD_LEFT : ON_ROAD_RIGHT;
              return (
                <li
                  key={scene.slug}
                  data-story-scene={scene.slug}
                  className={`relative pb-12 pl-14 last:pb-0 md:w-1/2 md:pb-8 ${
                    onLeft ? "md:pl-0 md:pr-16" : "md:ml-auto md:pl-16"
                  } ${i > 0 ? OVERLAP_SCENE : ""}`}
                >
                  <span
                    data-story-road
                    data-bend={bend}
                    aria-hidden="true"
                    className={`absolute left-[20px] top-[14px] h-full w-10 -translate-x-1/2 md:w-24 ${side} ${
                      isLast ? "" : OVERLAP_ROAD
                    }`}
                  >
                    <Stretch
                      bend={bend}
                      edge="[stroke-width:20px] md:[stroke-width:30px]"
                      middle="[stroke-width:14px] md:[stroke-width:22px]"
                    />
                    {/* The part already passed: shown and moved only by the motion code. */}
                    <span data-story-road-passed className="absolute inset-0 overflow-hidden opacity-0">
                      <span className="absolute inset-0">
                        <svg
                          viewBox="0 0 100 100"
                          preserveAspectRatio="none"
                          focusable="false"
                          fill="none"
                          strokeLinecap="round"
                          className="absolute inset-0 h-full w-full overflow-visible"
                        >
                          <path
                            d={roadPath(bend)}
                            stroke={BRAND.grain}
                            vectorEffect="non-scaling-stroke"
                            className="[stroke-width:12px] md:[stroke-width:20px]"
                          />
                        </svg>
                      </span>
                    </span>
                  </span>
                  <span
                    data-story-stop
                    aria-hidden="true"
                    className={`group absolute left-[20px] top-0 z-10 size-7 -translate-x-1/2 rounded-full border-4 border-coat bg-rice ${side}`}
                  >
                    <span className="absolute inset-0.5 rounded-full bg-coat opacity-0 transition-opacity duration-300 group-data-[active]:opacity-100" />
                  </span>
                  <div
                    data-story-content
                    className={`md:max-w-[26rem] ${onLeft ? "md:ml-auto" : ""}`.trim()}
                  >
                    <p data-story-step className="font-bold leading-7 text-coat">
                      {`${dict.story.step} ${i + 1}`}
                    </p>
                    {/*
                      The stage holds the sketch and, once the motion code adds it, the layer of
                      moving parts on top of it. The soft edges belong to the stage, so the moving
                      parts fade at the edges the same way as the sketch.
                    */}
                    <div
                      data-story-stage
                      className="story-scene-fade relative mt-3 aspect-[16/9] w-full overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- the scenes are small static WebP files served as they are */}
                      <img
                        src={scene.src}
                        width={scene.width}
                        height={scene.height}
                        loading="lazy"
                        decoding="async"
                        alt=""
                        className="block h-full w-full"
                      />
                    </div>
                    <h3 className="mt-4 text-xl font-bold text-earth">{title}</h3>
                    <p data-story-text className="mt-2 leading-relaxed">
                      {text}
                    </p>
                    {isLast && zalo !== null && (
                      <p className="mt-6">
                        <ZaloLink zalo={zalo} labels={dict.zalo} className={BUTTON_CLASS}>
                          {dict.story.zaloCta}
                        </ZaloLink>
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <div id="sau-cau-chuyen" tabIndex={-1} />
    </section>
  );
}

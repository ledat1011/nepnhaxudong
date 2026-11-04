import { SectionHeading } from "@/components/ui/SectionHeading";
import { zaloHref } from "@/lib/format";
import type { Dictionary } from "@/lib/i18n/dictionaries";
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

/**
 * The eight scenes from the seedling to the table. The static markup is a vertical list. Only
 * with `html[data-motion=on]` and a screen of 1024 px or more does it become one pinned
 * horizontal track; the scroll code finds its parts through the `data-story-*` hooks.
 */
export function RiceStory({ dict, zalo }: RiceStoryProps) {
  return (
    <section aria-labelledby="tu-hat-lua" data-rice-story className="bg-rice">
      <div className="mx-auto max-w-6xl px-4 pt-16 md:pt-24">
        <SectionHeading id="tu-hat-lua" title={dict.story.title} />
        <a
          href="#sau-cau-chuyen"
          data-story-skip
          className="sr-only focus:not-sr-only focus:mb-6 focus:inline-flex focus:min-h-11 focus:items-center focus:rounded-full focus:bg-coat focus:px-6 focus:text-rice focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-earth"
        >
          {dict.story.skip}
        </a>
        <ol
          data-story-progress
          aria-hidden="true"
          className="mb-6 hidden gap-2 lg:[html[data-motion=on]_&]:flex"
        >
          {STORY_SCENES.map((scene) => (
            <li key={scene.slug} className="size-3 rounded-full border-2 border-coat" />
          ))}
        </ol>
      </div>
      <div
        data-story-viewport
        className="mx-auto max-w-6xl px-4 pb-16 md:pb-24 lg:[html[data-motion=on]_&]:flex lg:[html[data-motion=on]_&]:h-svh lg:[html[data-motion=on]_&]:max-w-none lg:[html[data-motion=on]_&]:items-center lg:[html[data-motion=on]_&]:overflow-hidden lg:[html[data-motion=on]_&]:py-0"
      >
        <ol
          data-story-track
          className="grid gap-12 md:grid-cols-2 lg:[html[data-motion=on]_&]:flex lg:[html[data-motion=on]_&]:w-max lg:[html[data-motion=on]_&]:gap-8"
        >
          {STORY_SCENES.map((scene, i) => {
            const { title, text } = sceneText(dict, scene.slug);
            const isLast = i === STORY_SCENES.length - 1;
            return (
              <li
                key={scene.slug}
                data-story-scene={scene.slug}
                className="lg:[html[data-motion=on]_&]:w-[min(80vw,56rem)] lg:[html[data-motion=on]_&]:shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- the scenes are SVG files served as they are */}
                <img
                  src={scene.src}
                  width={scene.width}
                  height={scene.height}
                  loading="lazy"
                  decoding="async"
                  alt=""
                  className="aspect-[4/3] w-full rounded-2xl border-2 border-grain"
                />
                <h3 className="mt-4 text-xl font-bold text-earth">{title}</h3>
                <p className="mt-2 leading-relaxed">{text}</p>
                {isLast && zalo !== null && (
                  <p className="mt-6">
                    <a href={zaloHref(zalo)} className={BUTTON_CLASS}>
                      {dict.hero.zaloCta}
                    </a>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      <div id="sau-cau-chuyen" tabIndex={-1} />
    </section>
  );
}

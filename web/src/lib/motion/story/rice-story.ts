import { roadPoint } from "@/lib/story/road";
import type { SceneSlug } from "@/lib/story/scenes";
import { whenIdle } from "../idle";
import type { GsapModules, MotionSetup } from "../load-gsap";
import { pendingHashScroll, shouldHideElement } from "../reveal";
import { getLoopController, type Loop, type LoopEntry } from "../loops";
import { LOOP_MIN_GAP_S, type Setter } from "../throttle";
import { inlineSvg } from "./inline-svg";
import { SCENE_MOTIONS } from "./scene-motions";

type Gsap = GsapModules["gsap"];

/** A drawing starts to load when its scene is one screen below the bottom of the screen. */
export const STORY_LOAD_AHEAD = "top bottom+=100%";
/** A scene's intro plays when its top reaches this part of the screen height. */
export const STORY_INTRO_LINE = 0.75;
/**
 * The grain is where this line of the screen (a part of its height) crosses the road, and the
 * stop of the scene on this line is filled.
 */
export const STORY_ROAD_LINE = 0.5;
/**
 * The page work of a drawing (parse and swap, then build its motion) waits for an idle moment, at
 * most this long per step, so it does not land in a frame of the scroll. Two steps stay well
 * inside the screen and a quarter between the load trigger and the intro line.
 */
export const STORY_IDLE_TIMEOUT_MS = 300;
/** The grain follows the scroll this many seconds late, so it glides instead of jumping. */
export const STORY_ROAD_SCRUB_S = 0.6;
/** After a long gap (a background tab), the loop goes on from where it was, not far ahead. */
const LOOP_MAX_STEP_S = 0.1;

type Scene = {
  li: HTMLElement;
  slug: SceneSlug;
  svg: SVGSVGElement | null;
  played: boolean;
  /** The scene has come on screen: its waits end at once. */
  urgent: boolean;
  /** Ends the scene's current wait. */
  wake: (() => void) | null;
};

/**
 * Plays a paused GSAP loop by stepping it from GSAP's ticker, at most LOOP_UPDATES_PER_S times a
 * second, because every frame repaints the scene's svg. The time while it is paused does not count.
 */
export function throttledLoop(gsap: Gsap, loop: Pick<gsap.core.Timeline, "totalTime">): Loop {
  let last: number | null = null;
  let running = false;
  const tick = (time: number) => {
    if (last === null) {
      last = time;
      return;
    }
    const passed = time - last;
    if (passed < LOOP_MIN_GAP_S) return;
    last = time;
    loop.totalTime(loop.totalTime() + Math.min(passed, LOOP_MAX_STEP_S));
  };
  return {
    play() {
      if (running) return;
      running = true;
      last = null;
      gsap.ticker.add(tick);
    },
    pause() {
      if (!running) return;
      running = false;
      gsap.ticker.remove(tick);
    },
  };
}

type Stretch = {
  el: HTMLElement;
  bend: number;
  /** Moves the passed layer's window and, the other way, its content (both `yPercent`). */
  setWindow: Setter | null;
  setContent: Setter | null;
  /** The part of the stretch already passed, last drawn. */
  shown: number;
  box: { top: number; left: number; width: number; height: number };
};

/**
 * Moves the rice grain down the road with the scroll and darkens the road it has passed. One
 * scrubbed tween drives a proxy from 0 (the top of the road reaches the screen line) to 1 (its
 * bottom does); each update writes two transforms per stretch that changed and the grain's x
 * and y. The road is measured again at every refresh. Returns the cleanup.
 */
function setupRoad(
  { gsap, ScrollTrigger }: GsapModules,
  wrap: HTMLElement,
  grain: HTMLElement,
  scenes: Scene[],
): () => void {
  const stretches: Stretch[] = [];
  for (const { li } of scenes) {
    const el = li.querySelector<HTMLElement>("[data-story-road]");
    if (!el) continue;
    const passed = el.querySelector<HTMLElement>("[data-story-road-passed]");
    const content = passed?.firstElementChild ?? null;
    stretches.push({
      el,
      bend: Number(el.dataset.bend) || 50,
      setWindow: passed ? (gsap.quickSetter(passed, "yPercent") as Setter) : null,
      setContent: content ? (gsap.quickSetter(content, "yPercent") as Setter) : null,
      shown: -1,
      box: { top: 0, left: 0, width: 0, height: 0 },
    });
  }
  if (stretches.length === 0) return () => undefined;

  const passedLayers = stretches.flatMap(
    (s) => s.el.querySelector<HTMLElement>("[data-story-road-passed]") ?? [],
  );
  // The layer hint only while the grain moves; the context revert removes it with the rest.
  gsap.set(grain, { opacity: 1, xPercent: -50, yPercent: -50, willChange: "transform" });
  if (passedLayers.length > 0) gsap.set(passedLayers, { opacity: 1 });
  const grainX = gsap.quickSetter(grain, "x", "px") as Setter;
  const grainY = gsap.quickSetter(grain, "y", "px") as Setter;

  const measure = () => {
    const outer = wrap.getBoundingClientRect();
    for (const s of stretches) {
      const box = s.el.getBoundingClientRect();
      s.box = { top: box.top - outer.top, left: box.left - outer.left, width: box.width, height: box.height };
      s.shown = -1;
    }
  };

  const proxy = { part: 0 };
  const draw = () => {
    const first = stretches[0].box;
    const last = stretches[stretches.length - 1].box;
    // The proxy runs while the road's top to bottom crosses the screen line, so the grain
    // reaches each stop when that scene's top is on the line (and its stop fills).
    const span = last.top + last.height - first.top;
    const y = first.top + Math.min(1, Math.max(0, proxy.part)) * span;
    let index = stretches.findIndex((s) => y < s.box.top + s.box.height);
    if (index === -1) index = stretches.length - 1;
    stretches.forEach((s, i) => {
      const part = i < index ? 1 : i > index ? 0 : s.box.height > 0 ? (y - s.box.top) / s.box.height : 0;
      const clamped = Math.min(1, Math.max(0, part));
      if (i === index) {
        const point = roadPoint(s.bend, clamped);
        grainX(s.box.left + (point.x / 100) * s.box.width);
        grainY(s.box.top + (point.y / 100) * s.box.height);
      }
      if (clamped === s.shown) return;
      s.shown = clamped;
      // The window slides down over the stretch while its content stays in place.
      s.setWindow?.(-100 * (1 - clamped));
      s.setContent?.(100 * (1 - clamped));
    });
  };

  const onRefresh = () => {
    measure();
    draw();
  };
  measure();
  draw();
  ScrollTrigger.addEventListener("refresh", onRefresh);

  const line = `${STORY_ROAD_LINE * 100}%`;
  gsap.to(proxy, {
    part: 1,
    ease: "none",
    onUpdate: draw,
    scrollTrigger: {
      trigger: wrap,
      start: `top ${line}`,
      end: `bottom ${line}`,
      scrub: STORY_ROAD_SCRUB_S,
    },
  });

  return () => ScrollTrigger.removeEventListener("refresh", onRefresh);
}

/**
 * The scroll story "Từ hạt lúa tới người dùng": a vertical timeline along a dirt road, the same
 * at every screen size, never pinned. A rice grain moves down the road with the scroll, the
 * road it has passed turns darker and the stop of the scene in the middle of the screen is
 * filled. Each scene's drawing is swapped for its inline svg one screen before that scene,
 * then gets its own intro (once) and loop (while on screen, after the intro, and not paused by
 * the visitor). A scene whose file fails, or whose drawing lacks a part, keeps its static image
 * (the final frame).
 */
export const setupRiceStory: MotionSetup = (modules, root) => {
  const { gsap, ScrollTrigger } = modules;
  const section = root.querySelector<HTMLElement>("[data-rice-story]");
  const wrap = section?.querySelector<HTMLElement>("[data-story-road-wrap]");
  if (!section || !wrap) return;

  const scenes: Scene[] = Array.from(
    wrap.querySelectorAll<HTMLElement>("li[data-story-scene]"),
    (li) => ({ li, slug: li.dataset.storyScene as SceneSlug, svg: null, played: false, urgent: false, wake: null }),
  );
  const stops = scenes.flatMap(({ li }) => li.querySelector<HTMLElement>("[data-story-stop]") ?? []);
  const grain = wrap.querySelector<HTMLElement>("[data-story-grain]");
  const controller = getLoopController();
  const entries: LoopEntry[] = [];
  let disposed = false;
  let undoRoad: () => void = () => undefined;
  const loads: ScrollTrigger[] = [];
  const waits = new Set<() => void>();

  /**
   * A wait that ends when the browser is idle, or at once when the scene is on screen. It is
   * rejected on cleanup, so a pending swap keeps its img.
   */
  const idle = (scene: Scene) => (): Promise<void> =>
    new Promise((resolve, reject) => {
      if (disposed) return reject(new Error("stopped"));
      if (scene.urgent) return resolve();
      const end = () => {
        cancel();
        waits.delete(stop);
        scene.wake = null;
      };
      const cancel = whenIdle(
        () => {
          end();
          resolve();
        },
        STORY_IDLE_TIMEOUT_MS,
        0,
      );
      const stop = () => {
        end();
        reject(new Error("stopped"));
      };
      waits.add(stop);
      scene.wake = () => {
        end();
        resolve();
      };
    });

  /** Builds the scene's motion and connects its intro and loop to the scroll. */
  const attach = (scene: Scene) => {
    const motion = scene.svg ? (SCENE_MOTIONS[scene.slug]?.(gsap, scene.svg) ?? null) : null;
    if (!motion) return;
    const { intro, loop } = motion;
    const entry = loop ? controller.add(throttledLoop(gsap, loop)) : null;
    if (entry) entries.push(entry);
    let onScreen = false;
    const sync = () => entry?.setVisible(onScreen && scene.played);

    intro.eventCallback("onComplete", () => {
      scene.played = true;
      sync();
    });
    // A scene that is already past its line (a `#hash` link, a restored scroll, a file that
    // came late) shows its final frame at once: nothing on screen disappears.
    if (!shouldHideElement(scene.li, pendingHashScroll(root), STORY_INTRO_LINE)) {
      intro.progress(1);
      scene.played = true;
    } else {
      ScrollTrigger.create({
        trigger: scene.li,
        start: `clamp(top ${STORY_INTRO_LINE * 100}%)`,
        once: true,
        onEnter: () => {
          intro.play();
        },
      });
    }
    if (entry) {
      const trigger = ScrollTrigger.create({
        trigger: scene.li,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => {
          onScreen = self.isActive;
          sync();
        },
      });
      onScreen = trigger.isActive;
      sync();
    }
  };

  // Everything, also what the late drawings add, is recorded here and reverted by the cleanup.
  const ctx = gsap.context(() => {
    for (const scene of scenes) {
      // Swapped by an earlier run of this setup (reduced motion was on for a while): the svg is
      // already in place and shows its final frame.
      const inline = scene.li.querySelector<SVGSVGElement>("svg[data-scene]");
      if (inline) {
        scene.svg = inline;
        attach(scene);
        continue;
      }
      const img = scene.li.querySelector("img");
      if (!img) continue;
      // Each drawing loads about one screen before its own scene, not with the whole section.
      const ready = idle(scene);
      loads.push(
        ScrollTrigger.create({
          trigger: scene.li,
          start: STORY_LOAD_AHEAD,
          once: true,
          onEnter: () => {
            void inlineSvg(img, undefined, ready).then(async (svg) => {
              if (disposed) return;
              // A run before a restart may have swapped this img while the file loaded here.
              scene.svg = svg ?? scene.li.querySelector<SVGSVGElement>("svg[data-scene]");
              if (!scene.svg) return;
              try {
                await ready();
              } catch {
                return;
              }
              ctx.add(() => attach(scene));
            });
          },
        }),
        ScrollTrigger.create({
          trigger: scene.li,
          start: "top bottom",
          once: true,
          onEnter: () => {
            scene.urgent = true;
            scene.wake?.();
          },
        }),
      );
    }

    const line = `${STORY_ROAD_LINE * 100}%`;
    scenes.forEach(({ li }) => {
      const stop = li.querySelector<HTMLElement>("[data-story-stop]");
      if (!stop) return;
      ScrollTrigger.create({
        trigger: li,
        start: `top ${line}`,
        end: `bottom ${line}`,
        onToggle: (self) => stop.toggleAttribute("data-active", self.isActive),
      });
    });

    if (grain) undoRoad = setupRoad(modules, wrap, grain, scenes);
  });

  return () => {
    disposed = true;
    waits.forEach((stop) => stop());
    loads.splice(0).forEach((trigger) => trigger.kill());
    entries.splice(0).forEach((entry) => entry.remove());
    undoRoad();
    ctx.revert();
    stops.forEach((stop) => stop.removeAttribute("data-active"));
  };
};

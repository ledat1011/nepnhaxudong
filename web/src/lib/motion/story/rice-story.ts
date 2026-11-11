import { buildOverlay, showOverlay, type Overlay } from "@/lib/story/overlay";
import { roadPoint } from "@/lib/story/road";
import type { SceneSlug } from "@/lib/story/scenes";
import type { GsapModules, MotionSetup } from "../load-gsap";
import { pendingHashScroll, shouldHideElement } from "../reveal";
import { getLoopController, type Loop, type LoopEntry } from "../loops";
import { LOOP_MIN_GAP_S, type Setter } from "../throttle";
import { SCENE_MOTIONS } from "./scene-motions";

type Gsap = GsapModules["gsap"];

/** A scene's moving parts start to load when it is one screen below the bottom of the screen. */
export const STORY_LOAD_AHEAD = "top bottom+=100%";
/** A scene's intro plays when its top reaches this part of the screen height. */
export const STORY_INTRO_LINE = 0.75;
/**
 * The grain is where this line of the screen (a part of its height) crosses the road, and the
 * stop of the scene on this line is filled.
 */
export const STORY_ROAD_LINE = 0.5;
/** The grain follows the scroll this many seconds late, so it glides instead of jumping. */
export const STORY_ROAD_SCRUB_S = 0.6;
/** After a long gap (a background tab), the loop goes on from where it was, not far ahead. */
const LOOP_MAX_STEP_S = 0.1;

type Scene = {
  li: HTMLElement;
  slug: SceneSlug;
  /** The box that holds the sketch; the overlay of moving parts goes in it. */
  stage: HTMLElement | null;
  overlay: Overlay | null;
  played: boolean;
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
 * then gets its own intro and loop (while on screen, after the intro, and not paused by
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
    (li) => ({
      li,
      slug: li.dataset.storyScene as SceneSlug,
      stage: li.querySelector<HTMLElement>("[data-story-stage]"),
      overlay: null,
      played: false,
    }),
  );
  const stops = scenes.flatMap(({ li }) => li.querySelector<HTMLElement>("[data-story-stop]") ?? []);
  const grain = wrap.querySelector<HTMLElement>("[data-story-grain]");
  const controller = getLoopController();
  const entries: LoopEntry[] = [];
  let disposed = false;
  let undoRoad: () => void = () => undefined;
  const loads: ScrollTrigger[] = [];

  /** Builds the scene's motion and connects its intro and loop to the scroll. */
  const attach = (scene: Scene) => {
    const overlay = scene.overlay;
    const motion = overlay ? (SCENE_MOTIONS[scene.slug]?.(gsap, overlay) ?? null) : null;
    if (!overlay || !motion) {
      // Nothing to move: the still sketch stays, without a layer over it.
      overlay?.root.remove();
      scene.overlay = null;
      return;
    }
    const { intro, loop } = motion;
    const entry = loop ? controller.add(throttledLoop(gsap, loop)) : null;
    if (entry) entries.push(entry);
    let onScreen = false;
    /** At the first frame and waiting for its line, playing the intro, or done (looping). */
    let state: "waiting" | "playing" | "done" = "waiting";
    const sync = () => entry?.setVisible(onScreen && scene.played);
    const playIntro = () => {
      if (state !== "waiting") return;
      state = "playing";
      intro.play(0);
    };
    // The owner wants each scene to play again from the start when it comes back (2026-11-11).
    // It is wound back only once it is wholly off screen, so the jump to the first frame is
    // never seen. The loop goes back to its start first: it ends where the intro ends, and
    // parts that only the loop moves (fireflies) are then at rest during the intro.
    const rewind = () => {
      if (state === "waiting") return;
      state = "waiting";
      scene.played = false;
      intro.pause();
      loop?.totalTime(0);
      intro.progress(0);
    };

    intro.eventCallback("onComplete", () => {
      state = "done";
      scene.played = true;
      sync();
    });
    // A scene that is already past its line (a `#hash` link, a restored scroll, layers that
    // came late) shows its final frame at once: nothing on screen disappears.
    if (!shouldHideElement(scene.li, pendingHashScroll(root), STORY_INTRO_LINE)) {
      intro.progress(1);
      state = "done";
      scene.played = true;
    }
    ScrollTrigger.create({
      trigger: scene.li,
      start: `clamp(top ${STORY_INTRO_LINE * 100}%)`,
      // Scrolling back up, the scene comes in from the top: it plays when its bottom reaches
      // the middle of the screen, so its picture is in view.
      end: "clamp(bottom 50%)",
      onEnter: playIntro,
      onEnterBack: playIntro,
    });
    // Shown only now that the intro has set its first frame (or its last): no flash of rest.
    showOverlay(overlay);
    const trigger = ScrollTrigger.create({
      trigger: scene.li,
      start: "top bottom",
      end: "bottom top",
      onToggle: (self) => {
        onScreen = self.isActive;
        if (!onScreen) rewind();
        sync();
      },
    });
    onScreen = trigger.isActive;
    sync();
  };

  // Everything, also what the late overlays add, is recorded here and reverted by the cleanup.
  const ctx = gsap.context(() => {
    for (const scene of scenes) {
      const stage = scene.stage;
      if (!stage) continue;
      // Each scene's moving parts load about one screen before the scene, not with the section.
      loads.push(
        ScrollTrigger.create({
          trigger: scene.li,
          start: STORY_LOAD_AHEAD,
          once: true,
          onEnter: () => {
            void buildOverlay(stage, scene.slug).then((overlay) => {
              if (disposed) {
                overlay?.root.remove();
                return;
              }
              scene.overlay = overlay;
              if (overlay) ctx.add(() => attach(scene));
            });
          },
        }),
      );
    }

    const line = `${STORY_ROAD_LINE * 100}%`;
    scenes.forEach(({ li }) => {
      const stop = li.querySelector<HTMLElement>("[data-story-stop]");
      if (!stop) return;
      // The stretch of road runs from this stop to the next one. From 768 px the next scene starts
      // before this one ends, so with the scene itself as the trigger two stops would be filled.
      ScrollTrigger.create({
        trigger: li.querySelector<HTMLElement>("[data-story-road]") ?? li,
        start: `top ${line}`,
        end: `bottom ${line}`,
        onToggle: (self) => stop.toggleAttribute("data-active", self.isActive),
      });
    });

    if (grain) undoRoad = setupRoad(modules, wrap, grain, scenes);
  });

  return () => {
    disposed = true;
    loads.splice(0).forEach((trigger) => trigger.kill());
    entries.splice(0).forEach((entry) => entry.remove());
    undoRoad();
    ctx.revert();
    // Reduced motion turned on, or the page left: back to the still sketches.
    for (const scene of scenes) {
      scene.overlay?.root.remove();
      scene.overlay = null;
    }
    stops.forEach((stop) => stop.removeAttribute("data-active"));
  };
};

import type { SceneSlug } from "@/lib/story/scenes";
import type { GsapModules, MotionSetup } from "../load-gsap";
import { getLoopController, type Loop } from "../loops";
import { inlineSvg } from "./inline-svg";
import { SCENE_MOTIONS } from "./scene-motions";

type Gsap = GsapModules["gsap"];
type ScrollTriggerStatic = GsapModules["ScrollTrigger"];
type Trigger = ScrollTrigger;

/** From this width the story is pinned and slides sideways; below it, it stays a vertical list. */
export const STORY_DESKTOP_QUERY = "(min-width: 1024px)";
/** Every other screen. */
export const STORY_PHONE_QUERY = `not all and ${STORY_DESKTOP_QUERY}`;
/** The pinned story takes this many screen heights of scrolling. */
export const STORY_PIN_SCREENS = 5;
/** The drawings start to load when the section is one screen below the bottom of the screen. */
export const STORY_LOAD_AHEAD = "top bottom+=100%";
/**
 * The scene loops draw at most this many frames per second, like the hero loop: their motion is
 * slow, and every frame repaints the scene's svg. GSAP's own ticker keeps 60/s for the rest.
 */
export const STORY_LOOP_UPDATES_PER_S = 30;

/** On a phone, an intro plays when its scene's top reaches this part of the screen height. */
const PHONE_INTRO_LINE = 0.75;
/** On a desktop, an intro plays when its scene's left edge reaches this part of the width. */
const DESKTOP_INTRO_LINE = 0.7;
/** Less than one frame of 30/s, so a frame that a 60 Hz screen shows a little early still draws. */
const LOOP_MIN_GAP_S = 1 / STORY_LOOP_UPDATES_PER_S - 0.004;
/** After a long gap (a background tab), the loop goes on from where it was, not far ahead. */
const LOOP_MAX_STEP_S = 0.1;

type Scene = { li: HTMLElement; slug: SceneSlug; svg: SVGSVGElement | null; played: boolean };
type Context = { add: (fn: () => void) => unknown };
type Branch = { attach: (scene: Scene) => (() => void) | void; cleanup: () => void };

/**
 * Plays a paused GSAP loop by stepping it from GSAP's ticker, at most STORY_LOOP_UPDATES_PER_S
 * times a second. The time while it is paused does not count.
 */
export function throttledLoop(
  gsap: Gsap,
  loop: Pick<gsap.core.Timeline, "totalTime">,
): Loop {
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

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function horizontalPadding(el: HTMLElement): { left: number; right: number } {
  const style = getComputedStyle(el);
  return { left: parseFloat(style.paddingLeft) || 0, right: parseFloat(style.paddingRight) || 0 };
}

/** The element named by `location.hash`, or null. */
function hashTarget(root: Document): HTMLElement | null {
  const raw = window.location.hash.slice(1);
  if (raw === "") return null;
  try {
    return root.getElementById(decodeURIComponent(raw));
  } catch {
    return root.getElementById(raw);
  }
}

/**
 * The scroll story "Từ hạt lúa tới người dùng". Each scene's drawing is swapped for its inline
 * svg one screen before the section, then gets its own intro (once) and loop (while on screen,
 * after the intro, and not paused by the visitor). Below 1024 px the scenes stay a vertical
 * list; from 1024 px the section is pinned and the scenes slide sideways. A scene whose file
 * fails, or whose drawing lacks a part, keeps its static image (the final frame).
 */
export const setupRiceStory: MotionSetup = ({ gsap, ScrollTrigger }, root) => {
  const section = root.querySelector<HTMLElement>("[data-rice-story]");
  const pin = section?.querySelector<HTMLElement>("[data-story-pin]");
  const viewport = section?.querySelector<HTMLElement>("[data-story-viewport]");
  const track = viewport?.querySelector<HTMLElement>("[data-story-track]");
  if (!section || !pin || !viewport || !track) return;

  const scenes: Scene[] = Array.from(
    track.querySelectorAll<HTMLElement>("li[data-story-scene]"),
    (li) => ({ li, slug: li.dataset.storyScene as SceneSlug, svg: null, played: false }),
  );
  const dots = Array.from(section.querySelectorAll<HTMLElement>("[data-story-progress] > li"));
  const controller = getLoopController();
  const attachers = new Set<(scene: Scene) => void>();
  let disposed = false;

  const load = ScrollTrigger.create({
    trigger: section,
    start: STORY_LOAD_AHEAD,
    once: true,
    onEnter: () => {
      for (const scene of scenes) {
        const img = scene.li.querySelector("img");
        if (!img) continue;
        void inlineSvg(img).then((svg) => {
          if (!svg || disposed) return;
          scene.svg = svg;
          attachers.forEach((attach) => attach(scene));
        });
      }
    },
  });

  /**
   * Builds the scene's motion and connects its loop. `startIntro` creates the trigger that plays
   * the intro, or returns false when the scene is already past it: then it shows the final
   * frame at once and hides nothing. `watchLoop` creates the trigger that reports whether the
   * scene is on screen.
   */
  const connect = (
    scene: Scene,
    startIntro: (play: () => void) => boolean,
    watchLoop: (onToggle: (self: { isActive: boolean }) => void) => Trigger,
  ): (() => void) | void => {
    const motion = scene.svg ? SCENE_MOTIONS[scene.slug](gsap, scene.svg) : null;
    if (!motion) return;
    const { intro, loop } = motion;
    const entry = loop ? controller.add(throttledLoop(gsap, loop)) : null;
    let onScreen = false;
    const sync = () => entry?.setVisible(onScreen && scene.played);

    intro.eventCallback("onComplete", () => {
      scene.played = true;
      sync();
    });
    if (scene.played || !startIntro(() => intro.play())) {
      intro.progress(1);
      scene.played = true;
    }
    if (entry) {
      const trigger = watchLoop((self) => {
        onScreen = self.isActive;
        sync();
      });
      onScreen = trigger.isActive;
      sync();
    }
    return () => entry?.remove();
  };

  const phone = (): Branch => ({
    attach: (scene) =>
      connect(
        scene,
        (play) => {
          if (scene.li.getBoundingClientRect().top < window.innerHeight * PHONE_INTRO_LINE) return false;
          ScrollTrigger.create({
            trigger: scene.li,
            start: `clamp(top ${PHONE_INTRO_LINE * 100}%)`,
            once: true,
            onEnter: play,
          });
          return true;
        },
        (onToggle) =>
          ScrollTrigger.create({ trigger: scene.li, start: "top bottom", end: "bottom top", onToggle }),
      ),
    cleanup: () => undefined,
  });

  const desktop = (): Branch => desktopBranch(gsap, ScrollTrigger, root, {
    section,
    pin,
    viewport,
    track,
    scenes,
    dots,
    connect,
  });

  /** Runs a layout branch inside its matchMedia context. */
  const run = (context: Context, make: () => Branch) => {
    const branch = make();
    const undo: Array<() => void> = [];
    // The drawings arrive after the branch started, so their motion is added to the branch's
    // context: `matchMedia().revert()` reverts it with the rest, back to the static drawing.
    const attach = (scene: Scene) => {
      context.add(() => {
        const cleanup = branch.attach(scene);
        if (cleanup) undo.push(cleanup);
      });
    };
    scenes.forEach((scene) => {
      if (scene.svg) attach(scene);
    });
    attachers.add(attach);
    return () => {
      attachers.delete(attach);
      undo.splice(0).forEach((fn) => fn());
      branch.cleanup();
    };
  };

  const mm = gsap.matchMedia();
  mm.add(STORY_DESKTOP_QUERY, (context: Context) => run(context, desktop));
  mm.add(STORY_PHONE_QUERY, (context: Context) => run(context, phone));

  return () => {
    disposed = true;
    load.kill();
    mm.revert();
    attachers.clear();
  };
};

type DesktopParts = {
  section: HTMLElement;
  pin: HTMLElement;
  viewport: HTMLElement;
  track: HTMLElement;
  scenes: Scene[];
  dots: HTMLElement[];
  connect: (
    scene: Scene,
    startIntro: (play: () => void) => boolean,
    watchLoop: (onToggle: (self: { isActive: boolean }) => void) => Trigger,
  ) => (() => void) | void;
};

/**
 * The pinned, sideways layout. The section's own flag switches the CSS to one row before any
 * trigger measures it. The pinned block holds the title, the progress dots and the track, and
 * leaves room at its top for the sticky site header.
 */
function desktopBranch(
  gsap: Gsap,
  ScrollTrigger: ScrollTriggerStatic,
  root: Document,
  { section, pin, viewport, track, scenes, dots, connect }: DesktopParts,
): Branch {
  // Measured before the layout changes: the content the visitor is looking at (a `#hash`
  // target below the story, a restored scroll) is put back on screen after the next refresh.
  const restore = captureView(root, section, scenes);

  section.dataset.storyMode = "horizontal";
  const header = root.querySelector("header");
  const measureHeader = () => {
    const height = header?.getBoundingClientRect().height ?? 0;
    section.style.setProperty("--story-header", `${Math.round(height)}px`);
  };
  measureHeader();
  ScrollTrigger.addEventListener("refreshInit", measureHeader);

  /** How far the track moves: its right end stops at the viewport's right padding. */
  const distance = () => {
    const pad = horizontalPadding(viewport);
    return Math.max(0, track.scrollWidth + pad.left + pad.right - viewport.clientWidth);
  };
  const move = gsap.to(track, {
    x: () => -distance(),
    ease: "none",
    scrollTrigger: {
      trigger: pin,
      pin: true,
      start: "top top",
      end: () => `+=${STORY_PIN_SCREENS * window.innerHeight}`,
      scrub: 1,
      invalidateOnRefresh: true,
    },
  });
  const pinned = move.scrollTrigger as Trigger;

  /** A scene's left edge on screen when the track has not moved yet. */
  const restLeft = (li: HTMLElement) =>
    li.getBoundingClientRect().left - track.getBoundingClientRect().left + horizontalPadding(viewport).left;
  /** The scroll position at which the scene's left edge is where the first scene starts. */
  const scrollFor = (li: HTMLElement) => {
    const first = scenes[0]?.li ?? li;
    const span = distance();
    const progress = span > 0 ? clamp01((restLeft(li) - restLeft(first)) / span) : 0;
    return pinned.start + progress * (pinned.end - pinned.start);
  };

  scenes.forEach((scene, i) => {
    const dot = dots[i];
    if (!dot) return;
    ScrollTrigger.create({
      trigger: scene.li,
      containerAnimation: move,
      start: "left center",
      end: "right center",
      onToggle: (self) => dot.toggleAttribute("data-active", self.isActive),
    });
  });

  // A focused link in a scene that is off to the side (the Zalo link in the last scene): the
  // browser would scroll the clipped viewport itself. Scroll the page to that scene instead.
  const onFocus = (event: FocusEvent) => {
    const li = (event.target as Element | null)?.closest<HTMLElement>("li[data-story-scene]");
    if (!li) return;
    viewport.scrollLeft = 0;
    window.scrollTo({ top: scrollFor(li), behavior: "instant" });
  };
  viewport.addEventListener("focusin", onFocus);

  const afterRefresh = () => {
    ScrollTrigger.removeEventListener("refresh", afterRefresh);
    restore?.(scrollFor);
  };
  if (restore) ScrollTrigger.addEventListener("refresh", afterRefresh);

  return {
    attach: (scene) =>
      connect(
        scene,
        (play) => {
          const inFirstFrame = restLeft(scene.li) < window.innerWidth * DESKTOP_INTRO_LINE;
          if (inFirstFrame) {
            // On screen as soon as the section comes up: it plays with the vertical scroll.
            if (scene.li.getBoundingClientRect().top < window.innerHeight * PHONE_INTRO_LINE) return false;
            ScrollTrigger.create({
              trigger: scene.li,
              start: `clamp(top ${PHONE_INTRO_LINE * 100}%)`,
              once: true,
              onEnter: play,
            });
            return true;
          }
          const passed =
            pinned.scroll() >= pinned.start &&
            scene.li.getBoundingClientRect().left < window.innerWidth * DESKTOP_INTRO_LINE;
          if (passed) return false;
          ScrollTrigger.create({
            trigger: scene.li,
            containerAnimation: move,
            start: `left ${DESKTOP_INTRO_LINE * 100}%`,
            once: true,
            onEnter: play,
          });
          return true;
        },
        (onToggle) =>
          ScrollTrigger.create({
            trigger: scene.li,
            containerAnimation: move,
            start: "left right",
            end: "right left",
            onToggle,
          }),
      ),
    cleanup: () => {
      ScrollTrigger.removeEventListener("refreshInit", measureHeader);
      ScrollTrigger.removeEventListener("refresh", afterRefresh);
      viewport.removeEventListener("focusin", onFocus);
      dots.forEach((dot) => dot.removeAttribute("data-active"));
      section.style.removeProperty("--story-header");
      delete section.dataset.storyMode;
    },
  };
}

/**
 * What the visitor sees when the pinned layout starts, so it can be shown again after the
 * pin has changed the page height. Returns null when the story starts below the top of the
 * screen: then nothing above the visitor's view changes.
 */
function captureView(
  root: Document,
  section: HTMLElement,
  scenes: Scene[],
): ((scrollFor: (li: HTMLElement) => number) => void) | null {
  const box = section.getBoundingClientRect();
  if (box.top >= 0) return null;

  if (box.bottom > 0) {
    // Inside the story: keep the scene at the top of the screen.
    const scene = scenes.find((s) => s.li.getBoundingClientRect().bottom > 0);
    if (!scene) return null;
    return (scrollFor) => window.scrollTo({ top: scrollFor(scene.li), behavior: "instant" });
  }

  // Below the story: keep the `#hash` target, or the first block on screen, where it is.
  const target = hashTarget(root);
  const after = (el: Element) =>
    Boolean(section.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) && !section.contains(el);
  let anchor: Element | null = target && after(target) ? target : null;
  if (!anchor) {
    for (let el = section.nextElementSibling; el; el = el.nextElementSibling) {
      if (el.getBoundingClientRect().bottom > 0) {
        anchor = el;
        break;
      }
    }
  }
  if (!anchor) return null;
  const top = anchor.getBoundingClientRect().top;
  const kept = anchor;
  return () => {
    const shift = kept.getBoundingClientRect().top - top;
    if (shift !== 0) window.scrollBy({ top: shift, behavior: "instant" });
  };
}

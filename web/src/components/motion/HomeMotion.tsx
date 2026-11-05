"use client";

import { useEffect } from "react";
import { loadGsap, type GsapModules, type MotionSetup } from "@/lib/motion/load-gsap";
import { whenScrollingStops } from "@/lib/motion/scroll-wait";
import { setupJourney } from "@/lib/motion/journey";
import { setupHeroScene } from "@/lib/motion/hero-scene";
import { setupMascot } from "@/lib/motion/mascot";
import {
  MOTION_OK_QUERY,
  prefersReducedMotion,
  REDUCED_MOTION_QUERY,
} from "@/lib/motion/reduced-motion";
import { setupProductBag } from "@/lib/motion/product-bag";
import { setupReveals } from "@/lib/motion/reveal";
import { setupRiceStory } from "@/lib/motion/story/rice-story";

/** In page order: the story comes before the journey below it. */
export const HOME_SETUPS: MotionSetup[] = [
  setupReveals,
  setupProductBag,
  setupMascot,
  setupHeroScene,
  setupRiceStory,
  setupJourney,
];
const IDLE_TIMEOUT_MS = 2000;
const IDLE_FALLBACK_MS = 200;

type MatchMediaHandle = { revert: () => void };

/** Waits until the browser is idle. Returns a function that cancels the wait. */
function whenIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, {
      timeout: IDLE_TIMEOUT_MS,
    });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, IDLE_FALLBACK_MS);
  return () => window.clearTimeout(id);
}

/** Calls `callback` at the window `load` event. Returns a function that cancels the wait. */
function whenLoaded(callback: () => void): () => void {
  window.addEventListener("load", callback, { once: true });
  return () => window.removeEventListener("load", callback);
}

type HomeMotionProps = { setups?: MotionSetup[] };

/**
 * Starts the home page motion after the page has loaded and is idle, and only when the user has
 * not asked for reduced motion. GSAP is not downloaded at all when reduced motion is on, and
 * never before the page's own files have loaded. Renders nothing.
 */
export function HomeMotion({ setups = HOME_SETUPS }: HomeMotionProps) {
  useEffect(() => {
    let disposed = false;
    let started = false;
    let cancelWait: (() => void) | null = null;
    let mm: MatchMediaHandle | null = null;

    const waitForIdle = () => {
      cancelWait = whenIdle(async () => {
        let modules: GsapModules;
        try {
          modules = await loadGsap();
        } catch (error) {
          // Nothing is hidden before the setups run, so the page stays complete without motion.
          console.warn("Home motion is off: GSAP did not load.", error);
          return;
        }
        if (disposed || mm !== null) return;
        // `ScrollTrigger.refresh()` writes the scroll position back, which would stop a running
        // `#hash` jump, smooth scroll or touch fling. GSAP's own `refresh(true)` guesses the end
        // of a scroll from a 200 ms gap, and the setups below are a long task that makes one.
        cancelWait = whenScrollingStops(() => {
          if (disposed || mm !== null) return;
          const media = modules.gsap.matchMedia();
          mm = media;
          media.add(MOTION_OK_QUERY, () => {
            const cleanups: Array<() => void> = [];
            for (const setup of setups) {
              const cleanup = setup(modules, document);
              if (typeof cleanup === "function") cleanups.push(cleanup);
            }
            // The setups do not create their triggers in page order (and the story adds some
            // later). Sorted, the refresh measures them top to bottom, as ScrollTrigger expects.
            modules.ScrollTrigger.sort();
            // A clamped start is applied only by a refresh, and the page load refresh is over.
            modules.ScrollTrigger.refresh();
            document.documentElement.dataset.motion = "on";
            return () => {
              cleanups.forEach((cleanup) => cleanup());
              delete document.documentElement.dataset.motion;
            };
          });
        });
      });
    };

    const start = () => {
      if (started) return;
      started = true;
      // The idle wait has a time limit, which can end before `load` on a busy page.
      if (document.readyState === "complete") {
        waitForIdle();
      } else {
        cancelWait = whenLoaded(waitForIdle);
      }
    };

    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    // Once started, `matchMedia().add()` reverts and re-runs the setups by itself
    // when the preference changes, so this only has to handle the first start.
    const onChange = (event: { matches: boolean }) => {
      if (event.matches) {
        if (mm === null) {
          cancelWait?.();
          cancelWait = null;
          started = false;
        }
      } else {
        start();
      }
    };
    query.addEventListener("change", onChange);
    if (!prefersReducedMotion()) start();

    return () => {
      disposed = true;
      cancelWait?.();
      query.removeEventListener("change", onChange);
      mm?.revert();
      delete document.documentElement.dataset.motion;
    };
  }, [setups]);

  return null;
}

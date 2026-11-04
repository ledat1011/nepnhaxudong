"use client";

import { useEffect } from "react";
import { loadGsap, type GsapModules, type MotionSetup } from "@/lib/motion/load-gsap";
import { whenHashScrollDone } from "@/lib/motion/hash-scroll";
import { setupJourney } from "@/lib/motion/journey";
import { setupMascot } from "@/lib/motion/mascot";
import {
  MOTION_OK_QUERY,
  prefersReducedMotion,
  REDUCED_MOTION_QUERY,
} from "@/lib/motion/reduced-motion";
import { setupReveals } from "@/lib/motion/reveal";

const HOME_SETUPS: MotionSetup[] = [setupReveals, setupMascot, setupJourney];
const IDLE_TIMEOUT_MS = 2000;
const IDLE_FALLBACK_MS = 200;

type MatchMediaHandle = { revert: () => void };

/** Waits until the browser is idle. Returns a function that cancels the wait. */
function whenIdle(callback: () => void): () => void {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: IDLE_TIMEOUT_MS });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, IDLE_FALLBACK_MS);
  return () => window.clearTimeout(id);
}

type HomeMotionProps = { setups?: MotionSetup[] };

/**
 * Starts the home page motion after the page is idle and the user has not asked for reduced
 * motion. GSAP is not downloaded at all when reduced motion is on. Renders nothing.
 */
export function HomeMotion({ setups = HOME_SETUPS }: HomeMotionProps) {
  useEffect(() => {
    let disposed = false;
    let started = false;
    let cancelWait: (() => void) | null = null;
    let mm: MatchMediaHandle | null = null;

    const start = () => {
      if (started) return;
      started = true;
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
        // Start only after a smooth scroll to a `#hash` target has ended.
        cancelWait = whenHashScrollDone(document, () => {
          if (disposed || mm !== null) return;
          const media = modules.gsap.matchMedia();
          mm = media;
          media.add(MOTION_OK_QUERY, () => {
            setups.forEach((setup) => setup(modules, document));
            const { ScrollTrigger } = modules;
            const onRefresh = () => {
              ScrollTrigger.removeEventListener("refresh", onRefresh);
              document.documentElement.dataset.motion = "on";
            };
            ScrollTrigger.addEventListener("refresh", onRefresh);
            // A clamped start is applied only by a refresh, and the page load refresh is over.
            // A refresh writes the scroll position back, which stops a running smooth scroll
            // or touch fling. `refresh(true)` waits until the page stops scrolling.
            ScrollTrigger.refresh(true);
            return () => {
              ScrollTrigger.removeEventListener("refresh", onRefresh);
              delete document.documentElement.dataset.motion;
            };
          });
        });
      });
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

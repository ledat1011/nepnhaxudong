"use client";

import { useEffect } from "react";
import { loadGsap, type MotionSetup } from "@/lib/motion/load-gsap";
import {
  MOTION_OK_QUERY,
  prefersReducedMotion,
  REDUCED_MOTION_QUERY,
} from "@/lib/motion/reduced-motion";
import { setupReveals } from "@/lib/motion/reveal";

const HOME_SETUPS: MotionSetup[] = [setupReveals];
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
        const modules = await loadGsap();
        if (disposed || mm !== null) return;
        const media = modules.gsap.matchMedia();
        mm = media;
        media.add(MOTION_OK_QUERY, () => {
          setups.forEach((setup) => setup(modules, document));
          // A clamped start is applied only by a refresh, and the page load refresh is over.
          modules.ScrollTrigger.refresh();
          document.documentElement.dataset.motion = "on";
          return () => {
            delete document.documentElement.dataset.motion;
          };
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

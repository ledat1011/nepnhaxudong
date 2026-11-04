import type { MotionSetup } from "./load-gsap";

const REVEAL_OFFSET_Y = 24;
const REVEAL_DURATION = 0.6;
const REVEAL_STAGGER = 0.08;

/**
 * Only an element whose top edge is below the bottom of the screen may start hidden.
 * An element in view or above the screen (a deep link, a restored scroll) stays visible.
 */
export function shouldHideOnSetup(rect: { top: number }, viewportHeight: number): boolean {
  return rect.top >= viewportHeight;
}

/**
 * How many pixels the page will still scroll to reach the element named by `location.hash`.
 * With `scroll-behavior: smooth` the jump to an anchor is still running when the motion starts.
 * Returns 0 when there is no hash, no matching element, or nothing left to scroll.
 */
export function pendingHashScroll(root: Document): number {
  const raw = window.location.hash.slice(1);
  if (raw === "") return 0;
  let id = raw;
  try {
    id = decodeURIComponent(raw);
  } catch {
    // Keep the raw text when the hash is not valid percent-encoding.
  }
  const target = root.getElementById(id);
  if (target === null) return 0;
  const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const wanted = target.getBoundingClientRect().top - margin;
  const room = root.documentElement.scrollHeight - window.innerHeight - window.scrollY;
  return Math.max(0, Math.min(wanted, room));
}

/** Slides every `[data-reveal]` element in when it scrolls into view. */
export const setupReveals: MotionSetup = ({ gsap, ScrollTrigger }, root) => {
  const offset = pendingHashScroll(root);
  const hidden = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).filter((el) =>
    shouldHideOnSetup({ top: el.getBoundingClientRect().top - offset }, window.innerHeight),
  );
  if (hidden.length === 0) return;

  gsap.set(hidden, { opacity: 0, y: REVEAL_OFFSET_Y });
  ScrollTrigger.batch(hidden, {
    start: "clamp(top 85%)",
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        opacity: 1,
        y: 0,
        duration: REVEAL_DURATION,
        ease: "power2.out",
        stagger: REVEAL_STAGGER,
      }),
  });
};

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

/** Slides every `[data-reveal]` element in when it scrolls into view. */
export const setupReveals: MotionSetup = ({ gsap, ScrollTrigger }, root) => {
  const hidden = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]")).filter((el) =>
    shouldHideOnSetup(el.getBoundingClientRect(), window.innerHeight),
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

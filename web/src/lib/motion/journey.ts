import type { MotionSetup } from "./load-gsap";
import { pendingHashScroll, shouldHideElement } from "./reveal";

const EVENT_OFFSET_Y = 24;
const EVENT_DURATION = 0.6;
const LEAF_DURATION = 0.5;
const LEAF_DELAY = 0.15;
const EAR_DURATION = 0.6;
const STEM_SCRUB_S = 0.5;
const POP_EASE = "back.out(2)";

/**
 * Grows the rice plant along the journey timeline: the stem follows the scroll, each event
 * fades in with a leaf popping out beside it, and the ear appears at the end of the stem.
 * Elements in view or above the screen at setup stay as they are.
 */
export const setupJourney: MotionSetup = ({ gsap, ScrollTrigger }, root) => {
  const line = root.querySelector<HTMLElement>("[data-journey-line]");
  const list = line?.parentElement?.querySelector<HTMLElement>("ol");
  if (!line || !list) return;
  const offset = pendingHashScroll(root);

  gsap.fromTo(
    line,
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: "none",
      transformOrigin: "top center",
      scrollTrigger: {
        trigger: list,
        start: "clamp(top 70%)",
        end: "clamp(bottom 70%)",
        scrub: STEM_SCRUB_S,
      },
    },
  );

  root.querySelectorAll<HTMLElement>("[data-journey-event]").forEach((event) => {
    if (!shouldHideElement(event, offset)) return;
    const leaf = event.querySelector<SVGElement>("[data-journey-leaf]");
    gsap.set(event, { opacity: 0, y: EVENT_OFFSET_Y });
    // The leaf joins the stem at its left end; the wrapper mirrors it on the left side.
    if (leaf) gsap.set(leaf, { scale: 0, transformOrigin: "0% 100%" });
    // The tweens are created now, paused, so `matchMedia().revert()` also removes them.
    const showEvent = gsap.to(event, {
      opacity: 1,
      y: 0,
      duration: EVENT_DURATION,
      ease: "power2.out",
      // A leftover transform would make the item the containing block of fixed children.
      clearProps: "transform",
      paused: true,
    });
    const showLeaf = leaf
      ? gsap.to(leaf, {
          scale: 1,
          duration: LEAF_DURATION,
          delay: LEAF_DELAY,
          ease: POP_EASE,
          paused: true,
        })
      : null;
    ScrollTrigger.create({
      trigger: event,
      start: "clamp(top 75%)",
      once: true,
      onEnter: () => {
        showEvent.play();
        showLeaf?.play();
      },
    });
  });

  const ear = root.querySelector<SVGElement>("[data-journey-ear]");
  if (ear && shouldHideElement(ear, offset)) {
    gsap.set(ear, { scale: 0, transformOrigin: "top center" });
    const showEar = gsap.to(ear, {
      scale: 1,
      duration: EAR_DURATION,
      ease: POP_EASE,
      paused: true,
    });
    ScrollTrigger.create({
      trigger: ear,
      start: "clamp(top 90%)",
      once: true,
      onEnter: () => {
        showEar.play();
      },
    });
  }
};

import type { GsapModules, MotionSetup } from "./load-gsap";
import { pendingHashScroll, shouldHideElement } from "./reveal";

/** The whole bag motion, in seconds, when the notes are present. */
export const BAG_DURATION_S = 2.5;

const GRAIN_FALL_PX = 120;
const GRAIN_STAGGER_S = 0.06;
const GRAIN_COUNT_FALLBACK = 1;
const AIR_RISE_PX = 24;
const NOTE_RISE_PX = 8;

const PART_NAMES = [
  "puffy",
  "brick",
  "grains",
  "wrinkles",
  "air",
  "seal",
  "label",
  "tray",
] as const;
type PartName = (typeof PART_NAMES)[number];

/**
 * Builds the paused timeline of the vacuum-packing inside `root` (a ProductBag figure or the
 * scene 6 svg). The static markup is the final frame, so the timeline ends exactly there and
 * its start state is applied when it is built. Returns null when a part is missing.
 * The notes step is skipped when `root` has no `[data-bag-note]`.
 */
export function buildBagTimeline(
  gsap: GsapModules["gsap"],
  root: Element,
): gsap.core.Timeline | null {
  const parts = {} as Record<PartName, Element>;
  for (const name of PART_NAMES) {
    const part = root.querySelector(`[data-bag='${name}']`);
    if (!part) return null;
    parts[name] = part;
  }
  const grains = Array.from(parts.grains.children);
  const notes = Array.from(root.querySelectorAll("[data-bag-note]"));
  const fall = 0.9 - GRAIN_STAGGER_S * Math.max(grains.length - 1, 0);

  const tl = gsap.timeline({ paused: true });

  // Grains fall into the bag. Each grain keeps its own rotate(), because GSAP reads the
  // transform attribute first and writes the same rotation back with the new `y`.
  tl.set(parts.puffy, { opacity: 1 }, 0);
  tl.set(parts.grains, { opacity: 1 }, 0);
  if (grains.length > 0) {
    tl.fromTo(
      grains,
      { y: -GRAIN_FALL_PX },
      {
        y: 0,
        duration: Math.max(fall, GRAIN_COUNT_FALLBACK * 0.1),
        ease: "power2.in",
        stagger: GRAIN_STAGGER_S,
      },
      0,
    );
  }
  tl.set(parts.grains, { opacity: 0 }, 0.9);

  // The bag shrinks around the rice.
  tl.to(parts.puffy, { opacity: 0, duration: 0.6, ease: "power2.out" }, 0.9);
  tl.fromTo(
    parts.brick,
    { scaleX: 1.04, scaleY: 1.08, transformOrigin: "50% 100%" },
    { scaleX: 1, scaleY: 1, duration: 0.6, ease: "power2.out" },
    0.9,
  );
  tl.fromTo(parts.wrinkles, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "power2.out" }, 0.9);
  tl.fromTo(
    parts.air,
    { opacity: 0.9, y: 0 },
    { opacity: 0, y: -AIR_RISE_PX, duration: 0.6, ease: "power1.out" },
    0.9,
  );

  // The seal is drawn from the left, then the label settles.
  tl.fromTo(
    parts.seal,
    { scaleX: 0, transformOrigin: "0% 50%" },
    { scaleX: 1, duration: 0.2, ease: "power2.out" },
    1.5,
  );
  tl.fromTo(
    parts.label,
    { rotation: -4, scale: 0.9, transformOrigin: "50% 50%" },
    { rotation: 0, scale: 1, duration: 0.3, ease: "back.out(2)" },
    1.7,
  );

  if (notes.length > 0) {
    tl.fromTo(
      notes,
      { opacity: 0, y: NOTE_RISE_PX },
      {
        opacity: 1,
        y: 0,
        duration: 0.35,
        ease: "power2.out",
        stagger: 0.075,
        clearProps: "transform",
      },
      2.0,
    );
  }
  // A paused timeline at time 0 has drawn nothing yet. Going to the end and back draws the
  // start state, so the bag is in its first frame before the motion plays.
  tl.progress(1).progress(0);
  return tl;
}

/**
 * Plays the bag motion once, when the product block scrolls into view. A bag that is already in
 * view or above the screen (a deep link, a restored scroll) is left in its final frame.
 */
export const setupProductBag: MotionSetup = ({ gsap, ScrollTrigger }, root) => {
  const figures = Array.from(root.querySelectorAll<HTMLElement>("[data-product-bag]"));
  if (figures.length === 0) return;
  const offset = pendingHashScroll(root);

  const undo: Array<() => void> = [];
  for (const figure of figures) {
    if (!shouldHideElement(figure, offset)) continue;
    const tl = buildBagTimeline(gsap, figure);
    if (!tl) continue;
    const trigger = ScrollTrigger.create({
      trigger: figure,
      start: "clamp(top 75%)",
      once: true,
      onEnter: () => {
        tl.play();
      },
    });
    undo.push(() => {
      trigger.kill();
      tl.revert();
    });
  }
  if (undo.length === 0) return;
  return () => undo.forEach((fn) => fn());
};

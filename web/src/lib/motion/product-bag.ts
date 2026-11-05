import type { GsapModules, MotionSetup } from "./load-gsap";

/** The unpack at the start of the bag motion, in seconds. */
export const BAG_UNPACK_S = 0.5;
/** The whole bag motion, in seconds, when the notes are present (unpack + pack). */
export const BAG_DURATION_S = 3.0;
/** The motion starts when the bag's top reaches this part of the screen height. */
export const BAG_START_LINE = 0.75;

const GRAIN_FALL_PX = 120;
const GRAIN_STAGGER_S = 0.06;
const GRAIN_RISE_S = 0.2;
const GRAIN_RISE_STAGGER_S = 0.01;
const AIR_RISE_PX = 24;
const NOTE_RISE_PX = 8;
const LABEL_LIFT_PX = 6;

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
 * scene 6 svg). Returns null when a part is missing. The notes steps are skipped when `root`
 * has no `[data-bag-note]`.
 *
 * The static markup is the final frame, and the timeline starts and ends there: building it
 * changes nothing on the page (no tween renders before it plays), and every step is a tween,
 * so nothing jumps. It first unpacks
 * the bag, then packs it again. Only `transform` and `opacity` move.
 *
 * | time (s)  | step                                                               |
 * |-----------|--------------------------------------------------------------------|
 * | 0.00-0.25 | the label lifts off and fades; the notes fade out                  |
 * | 0.10-0.30 | the seal opens from the right (`scaleX` to 0)                      |
 * | 0.15-0.50 | the brick puffs up into the loose bag; the wrinkles fade           |
 * | 0.20-0.49 | the grains fade in and rise out of the bag                         |
 * | 0.50-1.40 | the grains fall back in, each one a little later (`stagger`)       |
 * | 1.40-2.00 | the bag shrinks around the rice, the wrinkles show, air escapes    |
 * | 2.00-2.20 | the seal is drawn from the left (`scaleX` from 0)                  |
 * | 2.20-2.50 | the label settles: a little tilt, then straight (`back.out`)       |
 * | 2.50-3.00 | the 3 notes appear one after the other (`opacity`, `y` 8 px)       |
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

  // A `to` reads its start values when the playhead reaches it, so each step starts where the
  // step before ended; a `fromTo` here never renders before it plays (`immediateRender: false`).
  const tl = gsap.timeline({ paused: true });

  // Unpack: from the final frame to the loose bag.
  tl.to(
    parts.label,
    {
      rotation: -4,
      scale: 0.9,
      y: -LABEL_LIFT_PX,
      opacity: 0,
      transformOrigin: "50% 50%",
      duration: 0.25,
      ease: "power2.in",
    },
    0,
  );
  if (notes.length > 0) {
    tl.to(notes, { opacity: 0, y: NOTE_RISE_PX, duration: 0.25, ease: "power2.in" }, 0);
  }
  tl.to(parts.seal, { scaleX: 0, transformOrigin: "0% 50%", duration: 0.2, ease: "power2.in" }, 0.1);
  tl.to(
    parts.brick,
    { scaleX: 1.04, scaleY: 1.08, transformOrigin: "50% 100%", duration: 0.35, ease: "power2.out" },
    0.15,
  );
  tl.to(parts.wrinkles, { opacity: 0, duration: 0.35, ease: "power2.out" }, 0.15);
  // The puffy bag and the grains are hidden by an opacity attribute in the final frame. The
  // start is written out, so it does not depend on how the browser reports that attribute.
  tl.fromTo(
    parts.puffy,
    { opacity: 0 },
    { opacity: 1, duration: 0.35, ease: "power2.out", immediateRender: false },
    0.15,
  );
  tl.fromTo(
    parts.grains,
    { opacity: 0 },
    { opacity: 1, duration: 0.15, ease: "power1.out", immediateRender: false },
    0.2,
  );
  if (grains.length > 0) {
    // Each grain keeps its own rotate(): GSAP reads the transform attribute first and writes the
    // same rotation back with the new `y`.
    tl.to(
      grains,
      { y: -GRAIN_FALL_PX, duration: GRAIN_RISE_S, ease: "power2.out", stagger: GRAIN_RISE_STAGGER_S },
      0.2,
    );
  }

  // Pack: the earlier sequence, from the loose bag back to the final frame.
  const at = (t: number) => BAG_UNPACK_S + t;
  if (grains.length > 0) {
    tl.to(
      grains,
      { y: 0, duration: Math.max(fall, 0.1), ease: "power2.in", stagger: GRAIN_STAGGER_S },
      at(0),
    );
  }
  tl.to(parts.grains, { opacity: 0, duration: 0.15, ease: "power1.in" }, at(0.9));

  // The bag shrinks around the rice; a little air escapes from the mouth.
  tl.to(parts.puffy, { opacity: 0, duration: 0.6, ease: "power2.out" }, at(0.9));
  tl.to(parts.brick, { scaleX: 1, scaleY: 1, duration: 0.6, ease: "power2.out" }, at(0.9));
  tl.to(parts.wrinkles, { opacity: 1, duration: 0.6, ease: "power2.out" }, at(0.9));
  tl.fromTo(
    parts.air,
    { opacity: 0, y: 0 },
    { opacity: 0.9, duration: 0.15, ease: "power1.out", immediateRender: false },
    at(0.9),
  );
  tl.to(parts.air, { opacity: 0, y: -AIR_RISE_PX, duration: 0.45, ease: "power1.out" }, at(1.05));

  // The seal is drawn from the left, then the label settles.
  tl.to(parts.seal, { scaleX: 1, duration: 0.2, ease: "power2.out" }, at(1.5));
  tl.to(
    parts.label,
    { rotation: 0, scale: 1, y: 0, opacity: 1, duration: 0.3, ease: "back.out(2)" },
    at(1.7),
  );

  if (notes.length > 0) {
    tl.to(
      notes,
      {
        opacity: 1,
        y: 0,
        duration: 0.35,
        ease: "power2.out",
        stagger: 0.075,
        clearProps: "transform",
      },
      at(2.0),
    );
  }
  return tl;
}

/**
 * Plays the bag motion once, when the bag's top reaches the start line (75 % of the screen).
 * Nothing is hidden at setup: the bag shows its final frame until the motion plays, and the
 * motion starts and ends at that frame. A bag that is already past the line when the motion
 * code starts (a tall screen, a restored scroll) plays at once: a clamped start that is already
 * passed fires on the first refresh.
 */
export const setupProductBag: MotionSetup = ({ gsap, ScrollTrigger }, root) => {
  const figures = Array.from(root.querySelectorAll<HTMLElement>("[data-product-bag]"));
  if (figures.length === 0) return;

  const undo: Array<() => void> = [];
  for (const figure of figures) {
    const tl = buildBagTimeline(gsap, figure);
    if (!tl) continue;
    const trigger = ScrollTrigger.create({
      trigger: figure,
      start: `clamp(top ${BAG_START_LINE * 100}%)`,
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

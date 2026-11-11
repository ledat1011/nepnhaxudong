import { introTimeline, loopTimeline, pick, type SceneMotionBuilder } from "../scene-kit";

/*
 * Step 6, packing. The mother seals a bag in the vacuum machine: its clear lid presses down and
 * comes back. Then a new bag lands on top of the right stack. Distances are in CSS px.
 */

/** How far the lid presses down. The lid never moves up from its place in the sketch. */
export const LID_PRESS_PX = 5;
/** How far above its place the new bag starts. */
export const BAG_DROP_PX = 30;
/** The small bounce of the bag when it lands. */
const BAG_SETTLE_PX = 3;
/** The loop: one press, then the machine is still. */
export const DONG_GOI_LOOP_S = 4.5;
const LOOP_PRESS_AT = 1.2;

/**
 * One press of the lid at `at`: down, a short hold, back up (0.6 s of movement). The eases do
 * not overshoot, so the lid never goes above its place.
 */
function addPress(timeline: gsap.core.Timeline, lid: HTMLElement, at: number) {
  timeline
    .to(lid, { y: LID_PRESS_PX, duration: 0.25, ease: "power2.in" }, at)
    .to(lid, { y: 0, duration: 0.35, ease: "power2.out" }, at + 0.4);
}

/**
 * Intro (about 1.5 s): the lid presses down and comes back (a bag is sealed); then a new bag drops
 * onto the right stack, from 30 px above and invisible, and settles with a 3 px bounce.
 * Loop (4.5 s): the lid presses once at 1.2 s (0.75 s with the hold) and is still the rest of
 * the time. The bag stays at rest. Two layers move: the lid and the top bag.
 */
export const motionDongGoi: SceneMotionBuilder = (gsap, overlay) => {
  // The patch is not moved, but the bag may only leave its place when the wall behind it exists.
  const parts = pick(overlay, ["lid", "bag-top", "bag-top-patch"]);
  if (!parts) return null;
  const { lid, "bag-top": bag } = parts;

  const intro = introTimeline(gsap);
  // The first frame: the new bag is not there yet.
  intro.set(bag, { y: -BAG_DROP_PX, opacity: 0, immediateRender: true }, 0);
  addPress(intro, lid, 0.1);
  intro
    .to(bag, { opacity: 1, duration: 0.25, ease: "none" }, 0.75)
    .to(bag, { y: 0, duration: 0.5, ease: "power2.in" }, 0.75)
    .to(bag, { y: -BAG_SETTLE_PX, duration: 0.12, ease: "power1.out" })
    .to(bag, { y: 0, duration: 0.15, ease: "power1.in" });

  const loop = loopTimeline(gsap);
  addPress(loop, lid, LOOP_PRESS_AT);
  // Keeps the still time after the press inside the loop, so it lasts DONG_GOI_LOOP_S.
  loop.set(lid, { y: 0 }, DONG_GOI_LOOP_S);

  return { intro, loop };
};

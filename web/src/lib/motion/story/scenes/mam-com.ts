import { draw, INK, introTimeline, loopTimeline, type SceneMotionBuilder } from "../scene-kit";

/**
 * Step 8, the family tray. The scene has no cut layers: steam rises from the three warm dishes.
 * The sketch already draws still steam above them; the moving squiggles start at the top of each
 * dish, a little to the side of the still ones, and rise past them.
 */

/** Where each squiggle starts: x, and the y of its lower end (the top of the dish). */
const SQUIGGLES = [
  { x: 326, y: 436 }, // sticky-rice dome, top at about y 442
  { x: 356, y: 432 },
  { x: 506, y: 432 }, // bánh chưng, top at about y 438
  { x: 536, y: 432 },
  { x: 668, y: 464 }, // sweet soup bowl, rim at about y 470
  { x: 696, y: 462 },
] as const;

const HEIGHT = 40;
const RISE = 30;
const OPACITY = 0.5;
const STROKE = 2.5;
/**
 * In the loop a new squiggle starts every 1.2 s, the dishes in turn (dome, soup, bánh chưng),
 * and rises for 3 s. The last one ends with the loop, so the loop starts and ends with no steam.
 */
const LOOP_ORDER = [0, 4, 2, 1, 5, 3];
const LOOP_GAP = 1.2;
const LOOP_LIFE = 3;

/** A soft S line from the lower end up, like the brush steam of the sketch. */
function squigglePath(x: number, y: number): string {
  const h = HEIGHT;
  return `M ${x} ${y} C ${x - 6} ${y - h * 0.18} ${x - 6} ${y - h * 0.32} ${x} ${y - h / 2} S ${x + 6} ${y - h * 0.82} ${x} ${y - h}`;
}

/** One squiggle: it fades in, rises and fades out, starting at `at` on the timeline. */
function rise(timeline: gsap.core.Timeline, el: SVGPathElement, at: number, life: number, immediateRender: boolean): void {
  const fadeIn = life * 0.3;
  timeline
    .fromTo(el, { y: 0 }, { y: -RISE, duration: life, ease: "none", immediateRender }, at)
    .fromTo(el, { opacity: 0 }, { opacity: OPACITY, duration: fadeIn, ease: "sine.out", immediateRender }, at)
    .fromTo(
      el,
      { opacity: OPACITY },
      { opacity: 0, duration: life - fadeIn, ease: "sine.in", immediateRender: false },
      at + fadeIn,
    );
}

export const motionMamCom: SceneMotionBuilder = (gsap, overlay) => {
  const steam = SQUIGGLES.map(({ x, y }) =>
    draw(overlay.effects, "path", {
      d: squigglePath(x, y),
      fill: "none",
      stroke: INK,
      "stroke-width": STROKE,
      "stroke-linecap": "round",
      opacity: 0,
    }),
  );

  // Intro, 1.9 s: every squiggle rises once, a little after the one before.
  const intro = introTimeline(gsap);
  steam.forEach((el, i) => rise(intro, el, i * 0.1, 1.4, true));

  // Loop, 9 s: two or three squiggles in the air at a time.
  const loop = loopTimeline(gsap);
  LOOP_ORDER.forEach((index, i) => rise(loop, steam[index], i * LOOP_GAP, LOOP_LIFE, false));

  return { intro, loop };
};

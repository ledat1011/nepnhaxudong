import { introTimeline, loopTimeline, pick, type SceneMotionBuilder } from "../scene-kit";

/**
 * Step 3, the harvest: the father drives the combine harvester through the gold rice.
 * Only the reel at the front of the harvester moves (owner, 2026-11-11: "chỉ cần đầu máy gặt
 * chuyển động thôi"): it turns like a fan, all the time. The harvester itself stands still, and
 * there is no chaff or birds.
 * The reel turns behind the rice in front of it and the arm that holds it (both cut as layers
 * that stay still), over a flat patch that hides the drawn reel.
 */

/** The loop: 7 whole turns of the reel, so the seam does not show. */
export const GAT_LOOP_S = 10;
/** One turn of the reel. */
export const REEL_TURN_S = GAT_LOOP_S / 7;

/**
 * The reel turns clockwise (its lower paddles sweep the rice toward the machine) at one speed,
 * from the first frame of the intro on: the intro makes one whole turn, so it ends at rest, and
 * the loop goes on at the same speed.
 */
function turnReel(tl: gsap.core.Timeline, reel: HTMLElement, turns: number) {
  tl.fromTo(reel, { rotation: 0 }, { rotation: 360 * turns, duration: REEL_TURN_S * turns, ease: "none", immediateRender: false }, 0);
}

export const motionGat: SceneMotionBuilder = (gsap, overlay) => {
  // The patch and the two front layers do not move, but without them the turning reel would
  // show the drawn reel behind it and would cover the rice and the arm in front of it.
  const parts = pick(overlay, ["reel-bg", "reel", "reel-front", "reel-arm"] as const);
  if (!parts) return null;
  const intro = introTimeline(gsap);
  turnReel(intro, parts.reel, 1);
  const loop = loopTimeline(gsap);
  turnReel(loop, parts.reel, GAT_LOOP_S / REEL_TURN_S);
  return { intro, loop };
};

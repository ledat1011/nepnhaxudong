import { introTimeline, loopTimeline, pick, type SceneMotionBuilder } from "../scene-kit";

/**
 * Step 7: the shop hands a bag of rice to a customer, and the rice van stands by with its
 * engine running. The van never drives (owner's decision): its wheels turn in place, at one
 * steady speed from the first frame on (the owner wants the motion to go on, not stop after
 * the intro). The intro (about 1.6 s) lets the van bounce a few pixels and settle; the loop
 * (10 s) shakes it a little, like an engine that runs, and lets the cloud drift and back.
 */
/** One turn of a wheel; two whole turns per loop, so the seam does not show. */
export const WHEEL_TURN_S = 5;
const LOOP_S = 10;
const INTRO_S = 1.6;
/** The idle shake: up this far, in half shakes of this length (an even number per loop). */
const IDLE_PX = 0.6;
const IDLE_HALF_S = 0.2;

export const motionDenTayKhach: SceneMotionBuilder = (gsap, overlay) => {
  const parts = pick(overlay, ["cloud", "cloud-patch", "truck", "wheel-front", "wheel-back"] as const);
  if (!parts) return null;
  const { cloud, truck } = parts;
  const wheels = [parts["wheel-front"], parts["wheel-back"]];
  // The wheels lie over the van, so the van and its wheels always bounce as one.
  const van = [truck, ...wheels];

  // The van faces left, so its wheels turn anticlockwise: the rotation goes down. The intro
  // starts them where they reach 0 at its end, at the speed of the loop.
  const degreesPerS = 360 / WHEEL_TURN_S;
  gsap.set(wheels, { rotation: degreesPerS * INTRO_S });

  const intro = introTimeline(gsap);
  intro.to(wheels, { rotation: 0, duration: INTRO_S, ease: "none" }, 0);
  // As it stops, the body dips a few pixels, comes up a little and settles.
  intro.to(van, { y: 3, duration: 0.3, ease: "sine.inOut" }, 0.7);
  intro.to(van, { y: -1, duration: 0.25, ease: "sine.inOut" }, 1.0);
  intro.to(van, { y: 0, duration: 0.35, ease: "sine.out" }, 1.25);

  // A percent `x` is a share of the cloud's own width: 9 % is about 10 scene units.
  const loop = loopTimeline(gsap);
  loop.to(cloud, { x: "9%", duration: LOOP_S / 2, yoyo: true, repeat: 1 }, 0);
  loop.fromTo(wheels, { rotation: 0 }, { rotation: -degreesPerS * LOOP_S, duration: LOOP_S, ease: "none", immediateRender: false }, 0);
  loop.fromTo(
    van,
    { y: 0 },
    { y: -IDLE_PX, duration: IDLE_HALF_S, ease: "sine.inOut", yoyo: true, repeat: LOOP_S / IDLE_HALF_S - 1, immediateRender: false },
    0,
  );

  return { intro, loop };
};

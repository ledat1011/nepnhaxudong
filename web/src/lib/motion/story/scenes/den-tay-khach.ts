import { introTimeline, loopTimeline, pick, type SceneMotionBuilder } from "../scene-kit";

/**
 * Step 7: the shop hands a bag of rice to a customer, and the rice van has just parked. The
 * intro (about 1.6 s) lets the wheels roll to a stop while the van bounces a few pixels and
 * settles. The van never drives. The loop (10 s) only lets the cloud drift a little and back.
 */
export const motionDenTayKhach: SceneMotionBuilder = (gsap, overlay) => {
  const parts = pick(overlay, ["cloud", "cloud-patch", "truck", "wheel-front", "wheel-back"] as const);
  if (!parts) return null;
  const { cloud, truck } = parts;
  const wheels = [parts["wheel-front"], parts["wheel-back"]];
  // The wheels lie over the van, so the van and its wheels always bounce as one.
  const van = [truck, ...wheels];

  // The van faces left, so its wheels turn anticlockwise (the rotation goes down) as it comes
  // in: they start at 120 degrees and turn down to 0.
  gsap.set(wheels, { rotation: 120 });

  const intro = introTimeline(gsap);
  intro.to(wheels, { rotation: 0, duration: 1.1, ease: "power2.out" }, 0);
  // As it stops, the body dips a few pixels, comes up a little and settles.
  intro.to(van, { y: 3, duration: 0.3, ease: "sine.inOut" }, 0.7);
  intro.to(van, { y: -1, duration: 0.25, ease: "sine.inOut" }, 1.0);
  intro.to(van, { y: 0, duration: 0.35, ease: "sine.out" }, 1.25);

  // A percent `x` is a share of the cloud's own width: 9 % is about 10 scene units.
  const loop = loopTimeline(gsap);
  loop.to(cloud, { x: "9%", duration: 5, yoyo: true, repeat: 1 });

  return { intro, loop };
};

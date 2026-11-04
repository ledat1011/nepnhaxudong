import { MASCOT_PIVOTS } from "@/components/brand/generated/mascot";
import type { MotionSetup } from "./load-gsap";

export const HEAD_MAX_DEG = 3;
export const RICE_MAX_DEG = 6;
/** Scroll speed (px per second) at which a group reaches its maximum angle. */
export const FULL_TILT_VELOCITY = 1500;
/** Time without a scroll update after which the mascot settles back to 0°. */
export const SETTLE_AFTER_MS = 150;

const HEAD_FOLLOW_S = 0.3;
const RICE_FOLLOW_S = 0.6;
const HEAD_SETTLE_S = 1.2;
const RICE_SETTLE_S = 1.6;
const FOLLOW_EASE = "power3.out";
const SETTLE_EASE = "elastic.out(1, 0.35)";

/** The angle for a scroll velocity: linear up to `fullAt`, limited to ±`maxDeg`. */
export function tiltFor(velocity: number, maxDeg: number, fullAt: number): number {
  if (!Number.isFinite(velocity)) return 0;
  const angle = (velocity / fullAt) * maxDeg;
  return Math.min(maxDeg, Math.max(-maxDeg, angle));
}

const svgOrigin = ({ x, y }: { x: number; y: number }) => `${x} ${y}`;

/**
 * Tilts the mascot head with the scroll speed and swings the rice bundle the other way,
 * then lets both settle back to 0° when the scrolling stops.
 */
export const setupMascot: MotionSetup = ({ gsap, ScrollTrigger }, root) => {
  const svg = root.querySelector<SVGSVGElement>("svg[data-mascot]");
  const head = svg?.querySelector<SVGGElement>("#head");
  const rice = svg?.querySelector<SVGGElement>("#rice");
  if (!svg || !head || !rice) return;

  // `revert()` undoes this set last. GSAP restores only the properties a tween sets, so the
  // rotation is part of it: otherwise the revert would keep the angle left by the other tweens.
  gsap.set(head, { svgOrigin: svgOrigin(MASCOT_PIVOTS.head), rotation: 0 });
  gsap.set(rice, { svgOrigin: svgOrigin(MASCOT_PIVOTS.rice), rotation: 0 });

  const angleOf = (group: SVGGElement) => Number(gsap.getProperty(group, "rotation"));
  const headTo = gsap.quickTo(head, "rotation", { duration: HEAD_FOLLOW_S, ease: FOLLOW_EASE });
  const riceTo = gsap.quickTo(rice, "rotation", { duration: RICE_FOLLOW_S, ease: FOLLOW_EASE });
  // Every tween is made here, paused, so `matchMedia().revert()` also removes the ones
  // that a scroll update starts later.
  const headSettle = gsap.to(head, {
    rotation: 0,
    duration: HEAD_SETTLE_S,
    ease: SETTLE_EASE,
    paused: true,
  });
  const riceSettle = gsap.to(rice, {
    rotation: 0,
    duration: RICE_SETTLE_S,
    ease: SETTLE_EASE,
    paused: true,
  });

  // One tween drives a group at a time: the follow tweens stop while the mascot settles.
  const settle = () => {
    headTo.tween.pause();
    riceTo.tween.pause();
    headSettle.invalidate().restart();
    riceSettle.invalidate().restart();
  };
  const settleLater = gsap.delayedCall(SETTLE_AFTER_MS / 1000, settle).pause();

  ScrollTrigger.create({
    trigger: svg,
    start: "clamp(top bottom)",
    end: "bottom top",
    onUpdate: (self) => {
      const velocity = self.getVelocity();
      headSettle.pause();
      riceSettle.pause();
      // Start from the angle the group has now: by default quickTo would start from its own
      // last value, and after a settle that makes the group jump back to the old angle.
      headTo(tiltFor(velocity, HEAD_MAX_DEG, FULL_TILT_VELOCITY), angleOf(head));
      // The rice bundle lags behind, so it leans against the direction of the head.
      riceTo(-tiltFor(velocity, RICE_MAX_DEG, FULL_TILT_VELOCITY), angleOf(rice));
      settleLater.restart(true);
    },
  });
};

import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import { GAT_LOOP_S, motionGat, REEL_TURN_S } from "./gat";
import { testOverlay } from "./test-overlay";

const num = (el: Element, prop: string) => Number(gsap.getProperty(el, prop));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("motionGat", () => {
  it("moves only the reel: no other layer and no drawn effects", () => {
    const overlay = testOverlay("gat");
    const motion = motionGat(gsap, overlay)!;
    expect(overlay.effects.childElementCount).toBe(0);
    for (const timeline of [motion.intro, motion.loop!]) {
      const targets = timeline.getChildren(true, true, false).flatMap((t) => (t as gsap.core.Tween).targets());
      expect(new Set(targets)).toEqual(new Set([overlay.parts.reel]));
    }
  });

  it("does not need the harvester layer", () => {
    expect(motionGat(gsap, testOverlay("gat", ["harvester"]))).not.toBeNull();
  });

  it("turns the reel clockwise all the time, at one speed, through the intro and the loop", () => {
    const overlay = testOverlay("gat");
    const motion = motionGat(gsap, overlay)!;
    const reel = overlay.parts.reel;
    const speed = 360 / REEL_TURN_S;
    // Like a fan: about one turn in 1 to 2 s.
    expect(REEL_TURN_S).toBeGreaterThanOrEqual(1);
    expect(REEL_TURN_S).toBeLessThanOrEqual(2);
    motion.intro.time(0.5);
    expect(num(reel, "rotation")).toBeCloseTo(speed * 0.5, 1);
    // One whole turn: the intro ends where the loop starts.
    expect(motion.intro.duration()).toBeCloseTo(REEL_TURN_S, 3);
    const loop = motion.loop!;
    expect(loop.duration()).toBeCloseTo(GAT_LOOP_S, 3);
    let last = -1;
    for (let t = 0.25; t <= GAT_LOOP_S; t += 0.25) {
      loop.time(t);
      const rotation = num(reel, "rotation");
      expect(rotation).toBeGreaterThan(last);
      expect(rotation).toBeCloseTo(speed * t, 1);
      last = rotation;
    }
    // Whole turns per loop, so the seam does not show.
    expect((speed * GAT_LOOP_S) % 360).toBeCloseTo(0, 3);
  });

  it("leaves the still sketch when a reel layer is missing", () => {
    for (const part of ["reel-bg", "reel", "reel-front", "reel-arm"]) {
      expect(motionGat(gsap, testOverlay("gat", [part])), part).toBeNull();
    }
  });
});

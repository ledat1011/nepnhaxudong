import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import { BAG_DROP_PX, DONG_GOI_LOOP_S, LID_PRESS_PX, motionDongGoi } from "./dong-goi";
import { testOverlay } from "./test-overlay";

afterEach(() => {
  document.body.innerHTML = "";
});

function build() {
  const overlay = testOverlay("dong-goi");
  const motion = motionDongGoi(gsap, overlay)!;
  return { motion, lid: overlay.parts.lid, bag: overlay.parts["bag-top"] };
}

const y = (el: Element) => Number(gsap.getProperty(el, "y"));
const opacity = (el: Element) => Number(gsap.getProperty(el, "opacity"));

describe("motionDongGoi", () => {
  it("starts with the new bag above its place and invisible", () => {
    const { bag } = build();
    expect(y(bag)).toBeCloseTo(-BAG_DROP_PX, 5);
    expect(opacity(bag)).toBe(0);
  });

  it("lands the bag at rest at the end of the intro, in 1.5 to 2 s", () => {
    const { motion, bag } = build();
    expect(motion.intro.duration()).toBeGreaterThanOrEqual(1.5);
    expect(motion.intro.duration()).toBeLessThanOrEqual(2);
    motion.intro.progress(1);
    expect(y(bag)).toBeCloseTo(0, 5);
    expect(opacity(bag)).toBe(1);
  });

  it("only presses the lid down, in the intro and in the loop", () => {
    const { motion, lid } = build();
    let deepest = 0;
    for (let p = 0; p <= 1; p += 0.01) {
      motion.intro.progress(p);
      expect(y(lid)).toBeGreaterThanOrEqual(0);
      deepest = Math.max(deepest, y(lid));
    }
    expect(deepest).toBeCloseTo(LID_PRESS_PX, 1);
    deepest = 0;
    for (let t = 0; t <= DONG_GOI_LOOP_S; t += 0.05) {
      motion.loop!.totalTime(t);
      expect(y(lid)).toBeGreaterThanOrEqual(0);
      deepest = Math.max(deepest, y(lid));
    }
    expect(deepest).toBeCloseTo(LID_PRESS_PX, 1);
  });

  it("keeps the bag at rest in the loop and joins its end to its start", () => {
    const { motion, lid, bag } = build();
    expect(motion.loop!.duration()).toBeCloseTo(DONG_GOI_LOOP_S, 5);
    motion.intro.progress(1);
    for (let t = 0; t <= DONG_GOI_LOOP_S; t += 0.1) {
      motion.loop!.totalTime(t);
      expect(y(bag)).toBeCloseTo(0, 5);
      expect(opacity(bag)).toBe(1);
    }
    motion.loop!.totalTime(0.001);
    const start = y(lid);
    motion.loop!.totalTime(DONG_GOI_LOOP_S - 0.001);
    expect(start).toBeCloseTo(0, 5);
    expect(y(lid)).toBeCloseTo(start, 5);
  });
});

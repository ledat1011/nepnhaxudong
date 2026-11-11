import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import { motionDenTayKhach } from "./den-tay-khach";
import { testOverlay } from "./test-overlay";

const num = (el: Element, prop: string) => Number(gsap.getProperty(el, prop));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("motionDenTayKhach", () => {
  it("starts with the wheels turned and rolls them to a stop", () => {
    const overlay = testOverlay("den-tay-khach");
    const motion = motionDenTayKhach(gsap, overlay)!;
    for (const name of ["wheel-front", "wheel-back"]) {
      expect(num(overlay.parts[name], "rotation"), name).toBeCloseTo(120, 1);
    }
    motion.intro.progress(1);
    for (const name of ["wheel-front", "wheel-back"]) {
      expect(num(overlay.parts[name], "rotation"), name).toBeCloseTo(0, 1);
    }
    expect(motion.intro.duration()).toBeLessThanOrEqual(1.7);
  });

  it("bounces the van and its wheels together, by a few pixels", () => {
    const overlay = testOverlay("den-tay-khach");
    const { truck } = overlay.parts;
    const wheels = [overlay.parts["wheel-front"], overlay.parts["wheel-back"]];
    const { intro } = motionDenTayKhach(gsap, overlay)!;
    let deepest = 0;
    for (let t = 0; t <= intro.duration(); t += 0.05) {
      intro.time(t);
      const y = num(truck, "y");
      for (const wheel of wheels) expect(num(wheel, "y"), `t ${t.toFixed(2)}`).toBeCloseTo(y, 3);
      expect(num(truck, "x")).toBe(0);
      deepest = Math.max(deepest, Math.abs(y));
    }
    expect(deepest).toBeGreaterThan(1.5);
    expect(deepest).toBeLessThanOrEqual(3);
  });

  it("moves only the cloud in the loop, and its start and end look the same", () => {
    const overlay = testOverlay("den-tay-khach");
    const { intro, loop } = motionDenTayKhach(gsap, overlay)!;
    intro.progress(1);
    const { cloud } = overlay.parts;
    const targets = loop!.getChildren(true, true, false).flatMap((t) => t.targets());
    expect(new Set(targets)).toEqual(new Set([cloud]));
    expect(loop!.duration()).toBeCloseTo(10, 1);

    loop!.totalTime(0);
    const start = num(cloud, "x");
    loop!.totalTime(5);
    expect(num(cloud, "x") - start).toBeCloseTo(9, 1);
    loop!.totalTime(loop!.duration() - 1e-4);
    expect(num(cloud, "x")).toBeCloseTo(start, 2);
    expect(start).toBe(0);
  });
});

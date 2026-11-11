import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import { motionDenTayKhach, WHEEL_TURN_S } from "./den-tay-khach";
import { testOverlay } from "./test-overlay";

const num = (el: Element, prop: string) => Number(gsap.getProperty(el, prop));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("motionDenTayKhach", () => {
  it("turns the wheels at one steady speed, anticlockwise, through the intro and the loop", () => {
    const overlay = testOverlay("den-tay-khach");
    const motion = motionDenTayKhach(gsap, overlay)!;
    const wheels = [overlay.parts["wheel-front"], overlay.parts["wheel-back"]];
    const speed = 360 / WHEEL_TURN_S;
    const introS = motion.intro.duration();
    expect(introS).toBeLessThanOrEqual(1.7);
    for (const t of [0, introS / 2]) {
      motion.intro.time(t);
      for (const wheel of wheels) expect(num(wheel, "rotation")).toBeCloseTo(speed * (introS - t), 1);
    }
    motion.intro.progress(1);
    for (const wheel of wheels) expect(num(wheel, "rotation")).toBeCloseTo(0, 1);
    const loop = motion.loop!;
    for (const t of [1, 4, 9]) {
      loop.time(t);
      for (const wheel of wheels) expect(num(wheel, "rotation")).toBeCloseTo(-speed * t, 1);
    }
    expect((speed * loop.duration()) % 360).toBeCloseTo(0, 3);
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

  it("drifts the cloud and keeps the engine running in the loop; start and end look the same", () => {
    const overlay = testOverlay("den-tay-khach");
    const { intro, loop } = motionDenTayKhach(gsap, overlay)!;
    intro.progress(1);
    const { cloud, truck } = overlay.parts;
    const wheels = [overlay.parts["wheel-front"], overlay.parts["wheel-back"]];
    expect(loop!.duration()).toBeCloseTo(10, 1);

    let shake = 0;
    for (let t = 0.05; t < loop!.duration(); t += 0.05) {
      loop!.time(t);
      const y = num(truck, "y");
      for (const wheel of wheels) expect(num(wheel, "y")).toBeCloseTo(y, 3);
      shake = Math.max(shake, Math.abs(y));
    }
    // A small idle shake, not a bounce.
    expect(shake).toBeGreaterThan(0.3);
    expect(shake).toBeLessThanOrEqual(1);

    loop!.totalTime(0.0001);
    const start = [num(cloud, "x"), num(truck, "y")];
    loop!.totalTime(5);
    expect(num(cloud, "x") - start[0]).toBeCloseTo(9, 1);
    loop!.totalTime(loop!.duration() - 1e-4);
    expect(num(cloud, "x")).toBeCloseTo(start[0], 2);
    expect(num(truck, "y")).toBeCloseTo(start[1], 2);
    expect(start[0]).toBeCloseTo(0, 2);
  });
});

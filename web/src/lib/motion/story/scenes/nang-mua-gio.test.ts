import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import { motionNangMuaGio } from "./nang-mua-gio";
import { testOverlay } from "./test-overlay";

const num = (el: Element, prop: string) => Number(gsap.getProperty(el, prop));

function build(without: string[] = []) {
  const overlay = testOverlay("nang-mua-gio", without);
  const motion = motionNangMuaGio(gsap, overlay)!;
  const drops = Array.from(overlay.effects.querySelectorAll("path"));
  const sky = overlay.root.querySelector<SVGSVGElement>("svg[data-fireflies]")!;
  const fireflies = Array.from(sky?.querySelectorAll("circle") ?? []);
  return { overlay, motion, drops, sky, fireflies };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("motionNangMuaGio", () => {
  it("shows the young rice at the first frame and the night at the last", () => {
    const { overlay, motion } = build();
    const { young, green, night, cloud, wind } = overlay.parts;
    const firstFrame = () => {
      expect(num(young, "opacity")).toBe(1);
      expect(num(green, "opacity")).toBe(1);
      expect(num(night, "opacity")).toBe(0);
      expect(num(cloud, "opacity")).toBe(0);
      expect(num(wind, "opacity")).toBe(0);
    };
    // Before the intro plays (the overlay is shown at once), and when it is at its start.
    firstFrame();
    motion.intro.progress(1);
    expect(num(young, "opacity")).toBe(0);
    expect(num(green, "opacity")).toBe(0);
    expect(num(night, "opacity")).toBe(1);
    motion.intro.progress(0);
    firstFrame();
  });

  it("turns the young rice green before the green rice turns gold", () => {
    const { overlay, motion } = build();
    const { young, green } = overlay.parts;
    motion.intro.time(4.2);
    expect(num(young, "opacity")).toBeLessThan(0.05);
    expect(num(green, "opacity")).toBe(1);
    motion.intro.time(5.7);
    expect(num(green, "opacity")).toBeLessThan(0.05);
    expect(motion.intro.duration()).toBeGreaterThanOrEqual(6);
    expect(motion.intro.duration()).toBeLessThanOrEqual(7.5);
  });

  it("rains for about 2 s under the cloud, then the drops are gone", () => {
    const { motion, drops } = build();
    expect(drops.length).toBeGreaterThanOrEqual(5);
    for (const drop of drops) {
      expect(drop.getAttribute("fill")).toBe("#E6E6E6");
      expect(num(drop, "opacity")).toBe(0);
    }
    let first = Infinity;
    let last = 0;
    for (let t = 0; t <= motion.intro.duration(); t += 0.05) {
      motion.intro.time(t);
      for (const drop of drops) {
        if (num(drop, "opacity") < 0.01) continue;
        first = Math.min(first, t);
        last = Math.max(last, t);
        const x = num(drop, "x");
        const y = num(drop, "y");
        expect(x).toBeGreaterThanOrEqual(515);
        expect(x).toBeLessThanOrEqual(740);
        // The drop path reaches 8 units above and below its centre.
        expect(y - 8).toBeGreaterThanOrEqual(170);
        expect(y + 8).toBeLessThanOrEqual(300);
      }
    }
    expect(last - first).toBeGreaterThan(1.5);
    expect(last - first).toBeLessThan(2.6);
    motion.intro.progress(1);
    for (const drop of drops) expect(num(drop, "opacity")).toBe(0);
  });

  it("draws the fireflies above the night picture, dark until the loop", () => {
    const { overlay, motion, sky, fireflies } = build();
    expect(sky).not.toBeNull();
    expect(overlay.parts.night.compareDocumentPosition(sky) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(sky.getAttribute("viewBox")).toBe("0 0 1200 675");
    expect(sky.getAttribute("preserveAspectRatio")).toBe("none");
    expect(fireflies.length).toBeGreaterThanOrEqual(6);
    expect(fireflies.length).toBeLessThanOrEqual(10);
    for (const dot of fireflies) {
      expect(dot.getAttribute("fill")).toBe("#F2E2B6");
      expect(dot.hasAttribute("stroke")).toBe(false);
      const r = Number(dot.getAttribute("r"));
      expect(r).toBeGreaterThanOrEqual(2);
      expect(r).toBeLessThanOrEqual(3);
      const cy = Number(dot.getAttribute("cy"));
      expect(cy).toBeGreaterThanOrEqual(240);
      expect(cy).toBeLessThanOrEqual(420);
    }
    for (let t = 0; t <= motion.intro.duration(); t += 0.5) {
      motion.intro.time(t);
      for (const dot of fireflies) expect(num(dot, "opacity")).toBe(0);
    }
    motion.intro.progress(1);
    for (const dot of fireflies) expect(num(dot, "opacity")).toBe(0);
  });

  it("lets the fireflies glow at different times, and the loop starts and ends the same", () => {
    const { motion, fireflies } = build();
    motion.intro.progress(1);
    const loop = motion.loop!;
    const state = () => fireflies.map((dot) => [num(dot, "opacity"), num(dot, "y")]);

    loop.totalTime(0);
    const start = state();
    for (const [opacity, y] of start) {
      expect(opacity).toBe(0);
      expect(y).toBe(0);
    }
    const lit = new Set<number>();
    for (let t = 0; t < loop.duration(); t += 0.25) {
      loop.totalTime(t);
      const glowing = fireflies.filter((dot) => num(dot, "opacity") > 0.5);
      // Never all at once: they glow at different times.
      expect(glowing.length).toBeLessThan(fireflies.length);
      for (const dot of glowing) lit.add(fireflies.indexOf(dot));
    }
    expect(lit.size).toBe(fireflies.length);

    loop.totalTime(loop.duration() - 1e-4);
    const end = state();
    end.forEach(([opacity, y], i) => {
      expect(opacity).toBeCloseTo(start[i][0], 2);
      expect(y).toBeCloseTo(start[i][1], 2);
    });
  });

  it("still plays without the green rice: the young rice fades straight to gold", () => {
    const { overlay, motion } = build(["green"]);
    expect(motion).not.toBeNull();
    const { young, night } = overlay.parts;
    expect(num(young, "opacity")).toBe(1);
    motion.intro.progress(1);
    expect(num(young, "opacity")).toBe(0);
    expect(num(night, "opacity")).toBe(1);
  });
});

import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import { motionCayMa } from "./cay-ma";
import { testOverlay } from "./test-overlay";

const x = (el: Element) => Number(gsap.getProperty(el, "x"));
const opacity = (el: Element) => Number(gsap.getProperty(el, "opacity"));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("motionCayMa", () => {
  it("draws two clipped water rings for each of the three people", () => {
    const overlay = testOverlay("cay-ma");
    motionCayMa(gsap, overlay);
    const groups = overlay.effects.querySelectorAll("g[clip-path]");
    expect(groups).toHaveLength(3);
    for (const group of groups) {
      const id = group.getAttribute("clip-path")!.slice(5, -1);
      expect(overlay.effects.querySelector(`clipPath[id="${id}"]`)).not.toBeNull();
      expect(group.querySelectorAll("ellipse")).toHaveLength(2);
    }
    for (const ring of overlay.effects.querySelectorAll("ellipse")) {
      expect(ring.getAttribute("fill")).toBe("none");
      expect(ring.getAttribute("stroke")).toBe("#FFFFFF");
    }
  });

  it("starts the intro with the clouds to the side and the rings hidden", () => {
    const overlay = testOverlay("cay-ma");
    const motion = motionCayMa(gsap, overlay)!;
    motion.intro.progress(0);
    expect(x(overlay.parts["cloud-left"])).toBeCloseTo(-14, 1);
    expect(x(overlay.parts["cloud-right"])).toBeCloseTo(14, 1);
    for (const ring of overlay.effects.querySelectorAll("ellipse")) expect(opacity(ring)).toBe(0);
  });

  it("shows the rings during the intro and hides them at its end", () => {
    const overlay = testOverlay("cay-ma");
    const motion = motionCayMa(gsap, overlay)!;
    const rings = [...overlay.effects.querySelectorAll("ellipse")];
    motion.intro.seek(0.6);
    expect(rings.some((ring) => opacity(ring) > 0.3)).toBe(true);
    motion.intro.progress(1);
    for (const ring of rings) expect(opacity(ring)).toBeCloseTo(0, 2);
  });

  it("plays a slow loop that starts and ends at rest", () => {
    const overlay = testOverlay("cay-ma");
    const motion = motionCayMa(gsap, overlay)!;
    motion.intro.progress(1);
    const loop = motion.loop!;
    expect(loop.duration()).toBeGreaterThanOrEqual(8);
    expect(loop.duration()).toBeLessThanOrEqual(10);
    const clouds = [overlay.parts["cloud-left"], overlay.parts["cloud-right"]];
    const rings = [...overlay.effects.querySelectorAll("ellipse")];
    const state = () => [...clouds.map(x), ...rings.map(opacity)];

    loop.progress(0);
    const start = state();
    expect(start.slice(0, 2)).toEqual([0, 0]);
    loop.seek(loop.duration() / 4);
    expect(Math.abs(x(clouds[0]))).toBeGreaterThan(5);
    loop.progress(1);
    state().forEach((value, i) => expect(value, `value ${i}`).toBeCloseTo(start[i], 2));
  });
});

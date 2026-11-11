import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import { INK } from "../scene-kit";
import { motionMamCom } from "./mam-com";
import { testOverlay } from "./test-overlay";

const y = (el: Element) => Number(gsap.getProperty(el, "y"));
const opacity = (el: Element) => Number(gsap.getProperty(el, "opacity"));

afterEach(() => {
  document.body.innerHTML = "";
});

describe("motionMamCom", () => {
  it("draws six ink steam squiggles with round caps", () => {
    const overlay = testOverlay("mam-com");
    motionMamCom(gsap, overlay);
    const steam = overlay.effects.querySelectorAll("path");
    expect(steam).toHaveLength(6);
    for (const path of steam) {
      expect(path.getAttribute("stroke")).toBe(INK);
      expect(path.getAttribute("stroke-linecap")).toBe("round");
      expect(path.getAttribute("fill")).toBe("none");
    }
  });

  it("lets the steam rise and fade in the intro", () => {
    const overlay = testOverlay("mam-com");
    const motion = motionMamCom(gsap, overlay)!;
    const steam = [...overlay.effects.querySelectorAll("path")];
    motion.intro.progress(0);
    for (const path of steam) expect(opacity(path)).toBe(0);
    motion.intro.seek(0.6);
    expect(steam.some((path) => opacity(path) > 0.3)).toBe(true);
    expect(steam.every((path) => y(path) < 0)).toBe(true);
    motion.intro.progress(1);
    for (const path of steam) {
      expect(opacity(path)).toBeCloseTo(0, 2);
      expect(y(path)).toBeCloseTo(-30, 1);
    }
  });

  it("plays a loop that starts and ends with no steam", () => {
    const overlay = testOverlay("mam-com");
    const motion = motionMamCom(gsap, overlay)!;
    motion.intro.progress(1);
    const loop = motion.loop!;
    const steam = [...overlay.effects.querySelectorAll("path")];
    loop.progress(0);
    for (const path of steam) expect(opacity(path)).toBe(0);
    loop.seek(2);
    expect(steam.filter((path) => opacity(path) > 0.1).length).toBeGreaterThanOrEqual(2);
    loop.progress(1);
    for (const path of steam) expect(opacity(path)).toBeCloseTo(0, 2);
  });
});

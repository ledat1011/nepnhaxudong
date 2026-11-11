import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import { testOverlay } from "./test-overlay";
import { CHUTE, HUSK_MOUTH, motionXayXat, XAY_XAT_INTRO_S, XAY_XAT_LOOP_S } from "./xay-xat";

afterEach(() => {
  document.body.innerHTML = "";
});

function build() {
  const overlay = testOverlay("xay-xat");
  const motion = motionXayXat(gsap, overlay)!;
  const grains = Array.from(overlay.effects.querySelectorAll<SVGElement>('[data-effect="rice-grain"]'));
  const flakes = Array.from(overlay.effects.querySelectorAll<SVGElement>('[data-effect="husk"]'));
  return { motion, grains, flakes };
}

const state = (el: Element) => ({
  x: Number(gsap.getProperty(el, "x")),
  y: Number(gsap.getProperty(el, "y")),
  opacity: Number(gsap.getProperty(el, "opacity")),
});

function expectSame(a: ReturnType<typeof state>[], b: ReturnType<typeof state>[]) {
  a.forEach((one, i) => {
    expect(b[i].opacity, `opacity ${i}`).toBeCloseTo(one.opacity, 1);
    // Positions only matter while the element can be seen.
    if (one.opacity > 0.05) {
      expect(b[i].x, `x ${i}`).toBeCloseTo(one.x, 0);
      expect(b[i].y, `y ${i}`).toBeCloseTo(one.y, 0);
    }
  });
}

describe("motionXayXat", () => {
  it("draws five rice grains and three husk flakes in the effects svg", () => {
    const { grains, flakes } = build();
    expect(grains).toHaveLength(5);
    expect(flakes).toHaveLength(3);
  });

  it("starts with an empty chute and no husk, and lasts 2 s", () => {
    const { motion, grains, flakes } = build();
    for (const el of [...grains, ...flakes]) expect(state(el).opacity).toBe(0);
    expect(motion.intro.duration()).toBeCloseTo(XAY_XAT_INTRO_S, 5);
    expect(motion.loop!.duration()).toBeCloseTo(XAY_XAT_LOOP_S, 5);
  });

  it("lets grains fall in the intro and puffs husk once", () => {
    const { motion, grains, flakes } = build();
    motion.intro.progress(1);
    expect(grains.filter((g) => state(g).opacity > 0.5).length).toBeGreaterThanOrEqual(3);
    motion.intro.progress(0.5);
    expect(flakes.some((f) => state(f).opacity > 0.5)).toBe(true);
  });

  it("starts the loop where the intro ends", () => {
    const { motion, grains, flakes } = build();
    const els = [...grains, ...flakes];
    motion.intro.progress(1);
    const end = els.map(state);
    motion.loop!.totalTime(0.001);
    expectSame(end, els.map(state));
  });

  it("joins the end of the loop to its start", () => {
    const { motion, grains, flakes } = build();
    const els = [...grains, ...flakes];
    motion.intro.progress(1);
    motion.loop!.totalTime(0.001);
    const start = els.map(state);
    motion.loop!.totalTime(XAY_XAT_LOOP_S - 0.001);
    expectSame(start, els.map(state));
  });

  it("keeps the grains in the chute and the husk up and right of the pipe", () => {
    const { motion, grains, flakes } = build();
    const check = () => {
      for (const g of grains) {
        const s = state(g);
        if (s.opacity < 0.01) continue;
        expect(s.y).toBeGreaterThanOrEqual(CHUTE.top.y - 0.01);
        expect(s.y).toBeLessThanOrEqual(CHUTE.bottom.y + 0.01);
        expect(Math.abs(s.x - (CHUTE.top.x + CHUTE.bottom.x) / 2)).toBeLessThan(9);
      }
      for (const f of flakes) {
        const s = state(f);
        if (s.opacity < 0.01) continue;
        expect(s.x).toBeGreaterThanOrEqual(HUSK_MOUTH.x - 0.01);
        expect(s.y).toBeLessThanOrEqual(HUSK_MOUTH.y + 0.01);
      }
    };
    for (let p = 0; p <= 1; p += 0.02) {
      motion.intro.progress(p);
      check();
    }
    for (let t = 0; t < XAY_XAT_LOOP_S; t += 0.1) {
      motion.loop!.totalTime(t);
      check();
    }
  });
});

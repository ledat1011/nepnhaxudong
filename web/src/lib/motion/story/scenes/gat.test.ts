import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import { BIRDS_FROM_X, BIRDS_TO_X, GAT_LOOP_S, motionGat } from "./gat";
import { testOverlay } from "./test-overlay";

const ALLOWED = new Set(["x", "y", "rotation", "scale", "scaleX", "scaleY", "opacity"]);
/** Keys GSAP itself keeps in a tween's vars, next to the timing keys the scene sets. */
const CONTROL = new Set([
  "duration", "ease", "delay", "repeat", "yoyo", "immediateRender", "overwrite", "parent", "startAt",
]);

const num = (el: Element, prop: string) => Number(gsap.getProperty(el, prop));

function build() {
  const overlay = testOverlay("gat");
  const motion = motionGat(gsap, overlay)!;
  const harvester = overlay.parts.harvester;
  const motes = [...overlay.effects.querySelectorAll("[data-mote]")];
  const flock = overlay.effects.querySelector('[data-effect="gat-birds"]')!;
  return { overlay, motion, harvester, motes, flock };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("motionGat", () => {
  it("draws chaff, dust and a flock of birds in ink", () => {
    const { overlay } = build();
    const chaff = overlay.effects.querySelectorAll('[data-mote="chaff"] ellipse');
    const dust = overlay.effects.querySelectorAll('[data-mote="dust"] circle');
    const birds = overlay.effects.querySelectorAll('[data-effect="gat-birds"] path');
    expect(chaff.length).toBeGreaterThanOrEqual(3);
    expect(dust.length).toBeGreaterThanOrEqual(2);
    expect(birds.length).toBeGreaterThanOrEqual(2);
    expect(birds.length).toBeLessThanOrEqual(3);
    for (const bird of birds) expect(bird.getAttribute("stroke-linecap")).toBe("round");
  });

  it("moves only transforms and opacity, also in the start values", () => {
    const { motion } = build();
    for (const timeline of [motion.intro, motion.loop!]) {
      for (const tween of timeline.getChildren(true, true, false)) {
        const vars = tween.vars as Record<string, unknown>;
        const keys = [...Object.keys(vars), ...Object.keys((vars.startAt as object) ?? {})];
        for (const key of keys) expect(ALLOWED.has(key) || CONTROL.has(key), key).toBe(true);
      }
    }
  });

  it("starts with no chaff and the birds out of view", () => {
    const { motes, flock } = build();
    for (const mote of motes) expect(num(mote, "opacity")).toBe(0);
    expect(num(flock, "x")).toBe(BIRDS_FROM_X);
  });

  it("shakes the harvester by at most 3 px when the engine starts, with a first puff", () => {
    const { motion, harvester, motes } = build();
    let moved = 0;
    for (let t = 0; t <= motion.intro.duration(); t += 0.02) {
      motion.intro.time(t);
      const shake = Math.max(Math.abs(num(harvester, "x")), Math.abs(num(harvester, "y")));
      expect(shake).toBeLessThanOrEqual(3);
      moved = Math.max(moved, shake);
    }
    expect(moved).toBeGreaterThan(1.5);
    motion.intro.time(0.8);
    expect(motes.some((m) => num(m, "opacity") > 0.5)).toBe(true);
  });

  it("lasts 1 to 2 seconds and ends at rest with the chaff gone", () => {
    const { motion, harvester, motes } = build();
    expect(motion.intro.duration()).toBeGreaterThanOrEqual(1);
    expect(motion.intro.duration()).toBeLessThanOrEqual(2);
    motion.intro.progress(1);
    expect(num(harvester, "x")).toBeCloseTo(0, 3);
    expect(num(harvester, "y")).toBeCloseTo(0, 3);
    for (const mote of motes) expect(num(mote, "opacity")).toBeCloseTo(0, 3);
  });

  it("loops for about 10 s, shaking about 1 px, with the birds crossing the sky", () => {
    const { motion, harvester, flock } = build();
    const loop = motion.loop!;
    expect(loop.duration()).toBeCloseTo(GAT_LOOP_S, 3);
    let shake = 0;
    for (let t = 0; t <= GAT_LOOP_S; t += 0.05) {
      loop.time(t);
      shake = Math.max(shake, Math.abs(num(harvester, "x")), Math.abs(num(harvester, "y")));
    }
    expect(shake).toBeLessThanOrEqual(1);
    loop.time(GAT_LOOP_S / 2);
    expect(num(flock, "x")).toBeGreaterThan(400);
    expect(num(flock, "x")).toBeLessThan(800);
    expect(BIRDS_TO_X - 50).toBeGreaterThan(1200);
  });

  it("looks the same at the start and the end of the loop", () => {
    const { motion, harvester, motes, flock } = build();
    const loop = motion.loop!;
    const look = () => [
      num(harvester, "x"),
      num(harvester, "y"),
      ...motes.map((m) => num(m, "opacity")),
      // The flock is out of view at both ends: left of the picture, or right of it.
      num(flock, "x") <= BIRDS_FROM_X || num(flock, "x") >= BIRDS_TO_X - 1,
    ];
    loop.time(0);
    const start = look();
    loop.time(loop.duration() - 1e-6);
    const end = look();
    for (const [i, value] of start.entries()) {
      if (typeof value === "number") expect(end[i] as number, String(i)).toBeCloseTo(value, 2);
      else expect(end[i], String(i)).toBe(value);
    }
  });

  it("leaves the still sketch when the harvester is missing", () => {
    const overlay = testOverlay("gat", ["harvester"]);
    expect(motionGat(gsap, overlay)).toBeNull();
    expect(overlay.effects.childElementCount).toBe(0);
  });
});

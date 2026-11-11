import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import { FAN_TURN_S, GLOW_REST, motionSay, SAY_LOOP_S } from "./say";
import { testOverlay } from "./test-overlay";

const ALLOWED = new Set(["x", "y", "rotation", "scale", "scaleX", "scaleY", "opacity"]);
/** Keys GSAP itself keeps in a tween's vars, next to the timing keys the scene sets. */
const CONTROL = new Set([
  "duration", "ease", "delay", "repeat", "yoyo", "immediateRender", "overwrite", "parent", "startAt",
]);

const num = (el: Element, prop: string) => Number(gsap.getProperty(el, prop));
/** How far an angle is from a whole number of turns, in degrees. */
const offTurn = (deg: number) => {
  const rest = ((deg % 360) + 360) % 360;
  return Math.min(rest, 360 - rest);
};

function build() {
  const overlay = testOverlay("say");
  const motion = motionSay(gsap, overlay)!;
  const fan = overlay.parts.fan;
  const glow = overlay.effects.querySelector('[data-effect="say-glow"]')!;
  const wisps = [...overlay.effects.querySelectorAll("[data-wisp]")];
  return { overlay, motion, fan, glow, wisps };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("motionSay", () => {
  it("draws the glow of the coals and three wisps of hot air", () => {
    const { overlay, glow, wisps } = build();
    expect(glow.getAttribute("fill")).toMatch(/^url\(#say-coal-glow-\d+\)$/);
    const id = glow.getAttribute("fill")!.slice(5, -1);
    expect(overlay.effects.querySelector(`radialGradient#${id}`)).not.toBeNull();
    expect(wisps).toHaveLength(3);
    for (const wisp of wisps) expect(wisp.querySelectorAll("path")).toHaveLength(2);
  });

  it("gives every built overlay its own gradient id", () => {
    const a = build().glow.getAttribute("fill");
    const b = build().glow.getAttribute("fill");
    expect(a).not.toBe(b);
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

  it("starts with cold coals, a still fan and no hot air", () => {
    const { motion, fan, glow, wisps } = build();
    motion.intro.time(0);
    expect(num(glow, "opacity")).toBe(0);
    expect(num(fan, "rotation")).toBe(0);
    for (const wisp of wisps) expect(num(wisp, "opacity")).toBe(0);
  });

  it("speeds the fan up and glows the coals up in the intro", () => {
    const { motion, fan, glow } = build();
    const speed = (t: number) => {
      motion.intro.time(t);
      const a = num(fan, "rotation");
      motion.intro.time(t + 0.05);
      return (num(fan, "rotation") - a) / 0.05;
    };
    expect(speed(0.1)).toBeLessThan(speed(0.5));
    expect(speed(0.5)).toBeLessThan(speed(1.2));
    // At the end of the spin-up it runs at full speed, as in the loop.
    expect(speed(1.2)).toBeCloseTo(360 / FAN_TURN_S, 0);
    motion.intro.time(0.9);
    expect(num(glow, "opacity")).toBeGreaterThan(0.3);
  });

  it("lasts 1 to 2 seconds and ends on a whole turn of the fan", () => {
    const { motion, fan, glow } = build();
    expect(motion.intro.duration()).toBeGreaterThanOrEqual(1);
    expect(motion.intro.duration()).toBeLessThanOrEqual(2);
    motion.intro.progress(1);
    expect(num(fan, "rotation")).toBeGreaterThan(0);
    expect(offTurn(num(fan, "rotation"))).toBeLessThan(0.01);
    expect(num(glow, "opacity")).toBeCloseTo(GLOW_REST, 3);
  });

  it("turns the fan a whole turn every 1.5 to 2 seconds in the loop", () => {
    const { motion, fan } = build();
    const loop = motion.loop!;
    expect(FAN_TURN_S).toBeGreaterThanOrEqual(1.5);
    expect(FAN_TURN_S).toBeLessThanOrEqual(2);
    for (let turn = 1; turn * FAN_TURN_S < SAY_LOOP_S; turn++) {
      loop.time(turn * FAN_TURN_S);
      expect(offTurn(num(fan, "rotation")), `turn ${turn}`).toBeLessThan(0.01);
    }
  });

  it("flickers the coals between 0.15 and 0.45 and lets hot air rise and fade", () => {
    const { motion, glow, wisps } = build();
    // The loop runs only after the intro, as on the page.
    motion.intro.progress(1);
    const loop = motion.loop!;
    let low = 1;
    let high = 0;
    let wispSeen = 0;
    for (let t = 0; t <= SAY_LOOP_S; t += 0.05) {
      loop.time(t);
      const o = num(glow, "opacity");
      low = Math.min(low, o);
      high = Math.max(high, o);
      for (const wisp of wisps) {
        if (num(wisp, "opacity") > 0.5) wispSeen++;
        expect(num(wisp, "y")).toBeLessThanOrEqual(0);
        expect(num(wisp, "y")).toBeGreaterThanOrEqual(-60);
      }
    }
    expect(low).toBeGreaterThanOrEqual(0.15);
    expect(high).toBeLessThanOrEqual(0.45);
    expect(high - low).toBeGreaterThan(0.15);
    expect(wispSeen).toBeGreaterThan(0);
  });

  it("looks the same at the start and the end of the loop", () => {
    const { motion, fan, glow, wisps } = build();
    motion.intro.progress(1);
    const loop = motion.loop!;
    const look = () => [
      offTurn(num(fan, "rotation")),
      num(glow, "opacity"),
      ...wisps.flatMap((w) => [num(w, "opacity"), num(w, "y") * num(w, "opacity")]),
    ];
    loop.time(0);
    const start = look();
    loop.time(loop.duration() - 1e-6);
    const end = look();
    for (const [i, value] of start.entries()) expect(end[i], String(i)).toBeCloseTo(value, 2);
  });

  it("leaves the still sketch when the fan is missing", () => {
    const overlay = testOverlay("say", ["fan"]);
    expect(motionSay(gsap, overlay)).toBeNull();
    expect(overlay.effects.childElementCount).toBe(0);
  });
});

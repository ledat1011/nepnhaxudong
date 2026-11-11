import { gsap } from "gsap";
import { afterEach, describe, expect, it } from "vitest";
import { STORY_SCENES } from "@/lib/story/scenes";
import { SCENE_MOTIONS } from "./scene-motions";
import { testOverlay } from "./scenes/test-overlay";

const SLUGS = STORY_SCENES.map((s) => s.slug);
/** The properties a scene may move: transforms and opacity only (no layout, no filters). */
const ALLOWED = new Set(["x", "y", "rotation", "scale", "scaleX", "scaleY", "opacity", "transformOrigin"]);
const CONTROL = new Set([
  "duration", "ease", "delay", "stagger", "repeat", "yoyo", "repeatDelay", "immediateRender",
  "overwrite", "onComplete", "onStart", "onUpdate", "onRepeat", "each", "from", "amount", "keyframes",
  // GSAP adds these itself: the timeline a tween belongs to, and the start values of from/fromTo.
  "parent", "startAt", "runBackwards",
]);

function tweenProps(timeline: gsap.core.Timeline): string[] {
  return timeline.getChildren(true, true, false).flatMap((t) => Object.keys(t.vars).filter((k) => !CONTROL.has(k)));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe.each(SLUGS)("scene motion %s", (slug) => {
  it("builds a paused intro and, if any, a paused endless loop", () => {
    const motion = SCENE_MOTIONS[slug](gsap, testOverlay(slug));
    expect(motion, "the scene has no motion yet").not.toBeNull();
    expect(motion!.intro.paused()).toBe(true);
    expect(motion!.intro.duration()).toBeGreaterThan(0);
    if (motion!.loop) {
      expect(motion!.loop.paused()).toBe(true);
      expect(motion!.loop.repeat()).toBe(-1);
    }
  });

  it("moves only transforms and opacity", () => {
    const motion = SCENE_MOTIONS[slug](gsap, testOverlay(slug))!;
    for (const timeline of [motion.intro, motion.loop].filter(Boolean) as gsap.core.Timeline[]) {
      for (const prop of tweenProps(timeline)) expect(ALLOWED.has(prop), prop).toBe(true);
    }
  });

  it("ends the intro with every cut layer at rest", () => {
    const overlay = testOverlay(slug);
    const motion = SCENE_MOTIONS[slug](gsap, overlay)!;
    motion.intro.progress(1);
    for (const [name, el] of Object.entries(overlay.parts)) {
      if (["green", "young", "night"].includes(name)) continue;
      expect(Number(gsap.getProperty(el, "x")), `${name} x`).toBeCloseTo(0, 1);
      expect(Number(gsap.getProperty(el, "y")), `${name} y`).toBeCloseTo(0, 1);
      expect(Number(gsap.getProperty(el, "opacity")), `${name} opacity`).toBeCloseTo(1, 2);
      const rotation = Number(gsap.getProperty(el, "rotation")) % 360;
      expect(Math.min(Math.abs(rotation), 360 - Math.abs(rotation)), `${name} rotation`).toBeLessThan(0.5);
      expect(Number(gsap.getProperty(el, "scale")), `${name} scale`).toBeCloseTo(1, 2);
    }
  });

  it("keeps the still sketch when a part is missing", () => {
    const names = Object.keys(testOverlay(slug).parts);
    document.body.innerHTML = "";
    // Step 2 plays on without its green rice when the browser cannot recolour the sketch.
    for (const name of names.filter((n) => n !== "green")) {
      expect(SCENE_MOTIONS[slug](gsap, testOverlay(slug, [name])), name).toBeNull();
    }
  });
});

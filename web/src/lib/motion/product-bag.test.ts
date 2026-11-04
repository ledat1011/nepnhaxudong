import { gsap } from "gsap";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GsapModules } from "./load-gsap";
import { BAG_DURATION_S, buildBagTimeline, setupProductBag } from "./product-bag";

const PARTS = ["puffy", "brick", "grains", "wrinkles", "air", "seal", "label", "tray"];
const GRAINS = Array.from(
  { length: 3 },
  (_, i) => `<ellipse data-grain="${i}" transform="rotate(-20 10 10)"></ellipse>`,
).join("");

function bagSvg(without: string[] = []) {
  const groups = PARTS.filter((p) => !without.includes(p))
    .map((p) => `<g data-bag="${p}">${p === "grains" ? GRAINS : ""}</g>`)
    .join("");
  return `<svg>${groups}</svg>`;
}
const NOTES = `<ul><li data-bag-note>a</li><li data-bag-note>b</li><li data-bag-note>c</li></ul>`;
const figure = (without: string[] = [], notes = NOTES) =>
  `<figure data-product-bag>${bagSvg(without)}${notes}</figure>`;

const ALLOWED_PROPS = new Set(["scaleX", "scaleY", "rotation", "scale", "opacity", "y"]);
const CONTROL_KEYS = new Set([
  "duration",
  "ease",
  "stagger",
  "transformOrigin",
  "immediateRender",
  "overwrite",
  "clearProps",
]);

describe("buildBagTimeline", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("returns null when a part is missing", () => {
    for (const part of PARTS) {
      document.body.innerHTML = figure([part]);
      const root = document.querySelector("figure") as Element;
      expect(buildBagTimeline(gsap, root), part).toBeNull();
    }
  });

  it("lasts BAG_DURATION_S and starts paused", () => {
    document.body.innerHTML = figure();
    const tl = buildBagTimeline(gsap, document.querySelector("figure") as Element);
    expect(tl).not.toBeNull();
    expect(tl?.duration()).toBeCloseTo(BAG_DURATION_S, 2);
    expect(tl?.paused()).toBe(true);
  });

  it("works on an svg root and skips the notes when there are none", () => {
    document.body.innerHTML = bagSvg();
    const svg = document.querySelector("svg") as Element;
    const tl = buildBagTimeline(gsap, svg);
    expect(tl?.duration()).toBeCloseTo(2.0, 2);
  });

  it("sets only transform and opacity properties", () => {
    document.body.innerHTML = figure();
    const vars: Record<string, unknown>[] = [];
    const real = gsap.timeline.bind(gsap);
    vi.spyOn(gsap, "timeline").mockImplementation((v) => {
      const tl = real(v);
      for (const method of ["to", "fromTo", "set", "from"] as const) {
        const original = (tl[method] as (...a: unknown[]) => unknown).bind(tl);
        (tl as unknown as Record<string, unknown>)[method] = (...args: unknown[]) => {
          args.forEach((a) => {
            if (a && typeof a === "object" && !(a instanceof Element) && !Array.isArray(a))
              vars.push({ ...(a as Record<string, unknown>) });
          });
          return original(...args);
        };
      }
      return tl;
    });
    buildBagTimeline(gsap, document.querySelector("figure") as Element);
    const keys = new Set(vars.flatMap((v) => Object.keys(v)));
    expect(keys.size).toBeGreaterThan(0);
    for (const key of keys) {
      expect(ALLOWED_PROPS.has(key) || CONTROL_KEYS.has(key), key).toBe(true);
    }
  });

  it("starts hidden, ends in the static frame, and keeps the grain rotation", () => {
    document.body.innerHTML = figure();
    const q = (name: string) => document.querySelector(`[data-bag='${name}']`) as SVGElement;
    const tl = buildBagTimeline(gsap, document.querySelector("figure") as Element);
    expect(q("puffy").style.opacity).toBe("1");
    expect(q("seal").style.transform).toContain("scale(0");
    const note = document.querySelector("[data-bag-note]") as HTMLElement;
    expect(note.style.opacity).toBe("0");

    tl?.progress(1);
    expect(q("puffy").style.opacity).toBe("0");
    expect(q("grains").style.opacity).toBe("0");
    expect(q("air").style.opacity).toBe("0");
    expect(q("wrinkles").style.opacity).toBe("1");
    expect(note.style.opacity).toBe("1");
    expect(note.style.transform).toBe("");
  });
});

function fakeModules() {
  const tl = { play: vi.fn(), revert: vi.fn(), kill: vi.fn() };
  const trigger = { kill: vi.fn() };
  const ScrollTrigger = { create: vi.fn(() => trigger) };
  return {
    modules: { gsap, ScrollTrigger } as unknown as GsapModules,
    ScrollTrigger,
    trigger,
    tl,
  };
}

function place(top: number) {
  document.body.innerHTML = figure();
  const el = document.querySelector("[data-product-bag]") as HTMLElement;
  el.getBoundingClientRect = () => ({ top }) as DOMRect;
  return el;
}

describe("setupProductBag", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerHeight", {
      value: 800,
      configurable: true,
    });
  });
  afterEach(() => {
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("does nothing without a bag", () => {
    const fake = fakeModules();
    expect(setupProductBag(fake.modules, document)).toBeUndefined();
    expect(fake.ScrollTrigger.create).not.toHaveBeenCalled();
  });

  it("hides nothing and creates no trigger when the bag is in view", () => {
    place(300);
    const fake = fakeModules();
    setupProductBag(fake.modules, document);
    expect(fake.ScrollTrigger.create).not.toHaveBeenCalled();
    const puffy = document.querySelector("[data-bag='puffy']") as SVGElement;
    expect(puffy.style.opacity).toBe("");
    expect((document.querySelector("[data-bag-note]") as HTMLElement).style.opacity).toBe("");
  });

  it("hides the bag below the screen and plays the timeline once when it arrives", () => {
    const el = place(1500);
    const fake = fakeModules();
    const play = vi.spyOn(gsap.core.Timeline.prototype, "play");
    const cleanup = setupProductBag(fake.modules, document);
    expect((document.querySelector("[data-bag='puffy']") as SVGElement).style.opacity).toBe("1");
    expect(fake.ScrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger: el,
        start: "clamp(top 75%)",
        once: true,
      }),
    );
    const vars = (
      fake.ScrollTrigger.create.mock.calls[0] as unknown as [{ onEnter: () => void }]
    )[0];
    expect(play).not.toHaveBeenCalled();
    vars.onEnter();
    expect(play).toHaveBeenCalledTimes(1);
    expect(typeof cleanup).toBe("function");
    (cleanup as () => void)();
    expect(fake.trigger.kill).toHaveBeenCalled();
    expect((document.querySelector("[data-bag='puffy']") as SVGElement).style.opacity).toBe("");
  });
});

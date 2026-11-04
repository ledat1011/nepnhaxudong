import { readFileSync } from "node:fs";
import { gsap } from "gsap";
import { afterEach, describe, expect, it, vi } from "vitest";
import { STORY_SCENES, type SceneSlug } from "@/lib/story/scenes";
import { SCENE_MOTIONS } from "./scene-motions";

/** The data-part table of Task 9: the one-time parts and the loop parts of each scene. */
const PARTS: Record<SceneSlug, { once: string[]; loop: string[] }> = {
  "cay-ma": { once: ["mother", "farmer", "seedling"], loop: ["ripple"] },
  "nang-mua-gio": {
    once: ["sun", "cloud", "wind", "rice", "rice-green", "rice-gold"],
    loop: ["rain", "rice-sway"],
  },
  gat: { once: ["harvester", "crop", "sack", "driver", "brother"], loop: ["reel"] },
  say: { once: ["air", "paddy", "father"], loop: ["fan-blades", "coals"] },
  "xay-xat": { once: ["brother", "pour-sack", "husk", "rice-flow"], loop: ["elevator-grain"] },
  "dong-goi": { once: ["mother", "lid", "stack-bag"], loop: [] },
  "den-tay-khach": {
    once: ["truck", "shelf-bag", "mother", "customer", "handover-bag", "gift"],
    loop: ["wheel"],
  },
  "mam-com": { once: ["dish"], loop: ["steam"] },
};
const SLUGS = STORY_SCENES.map((s) => s.slug);

const ALLOWED_PROPS = new Set(["x", "y", "scale", "scaleX", "scaleY", "rotation", "opacity"]);
const CONTROL_KEYS = new Set([
  "duration",
  "ease",
  "stagger",
  "transformOrigin",
  "immediateRender",
  "overwrite",
  "clearProps",
  "repeat",
  "yoyo",
  "repeatDelay",
  "each",
  "from",
  "amount",
]);

/** Puts the real scene file into the page and returns its svg. */
function mount(slug: SceneSlug): SVGSVGElement {
  const scene = STORY_SCENES.find((s) => s.slug === slug);
  const text = readFileSync(`public${scene?.src}`, "utf8");
  const doc = new DOMParser().parseFromString(text, "image/svg+xml");
  const svg = document.importNode(doc.documentElement, true) as unknown as SVGSVGElement;
  document.body.append(svg);
  return svg;
}

const allParts = (svg: SVGSVGElement) =>
  Array.from(svg.querySelectorAll<SVGElement>("[data-part], [data-bag]"));

/** The opacity the element shows: GSAP's inline style first, then the attribute, then 1. */
const opacityOf = (el: SVGElement) =>
  Number(el.style.opacity !== "" ? el.style.opacity : (el.getAttribute("opacity") ?? 1));

/** A transform that GSAP wrote and that moves nothing. */
const IDENTITY_PARTS =
  /none|translate\(0(?:px)?, ?0(?:px)?\)|translate3d\(0(?:px)?, ?0(?:px)?, ?0(?:px)?\)|rotate\(0deg\)|scale\(1(?:, ?1)?\)|skew\(0deg, ?0deg\)|matrix\(1, ?0, ?0, ?1, ?0, ?0\)/g;
const isIdentity = (transform: string) => transform.replace(IDENTITY_PARTS, "").trim() === "";

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("SCENE_MOTIONS", () => {
  it("has a motion for every scene", () => {
    expect(Object.keys(SCENE_MOTIONS).sort()).toEqual([...SLUGS].sort());
  });

  it.each(SLUGS)("%s: a paused intro of 1.5 to 2.5 s", (slug) => {
    const motion = SCENE_MOTIONS[slug](gsap, mount(slug));
    expect(motion).not.toBeNull();
    const intro = motion?.intro;
    expect(intro?.paused()).toBe(true);
    expect(intro?.duration()).toBeGreaterThanOrEqual(1.5);
    expect(intro?.duration()).toBeLessThanOrEqual(2.5);
  });

  it.each(SLUGS)("%s: a paused endless loop only when the scene has loop parts", (slug) => {
    const motion = SCENE_MOTIONS[slug](gsap, mount(slug));
    const loop = motion?.loop ?? null;
    if (PARTS[slug].loop.length === 0) {
      expect(loop).toBeNull();
      return;
    }
    expect(loop).not.toBeNull();
    expect(loop?.paused()).toBe(true);
    expect(loop?.repeat()).toBe(-1);
    expect(loop?.duration()).toBeGreaterThan(0);
  });

  it.each(SLUGS)("%s: the intro moves something and ends at the static frame", (slug) => {
    const svg = mount(slug);
    const parts = allParts(svg);
    const sourceTransforms = parts.map((el) => el.getAttribute("transform"));
    const motion = SCENE_MOTIONS[slug](gsap, svg);

    motion?.intro.progress(0.2);
    const moving = parts.filter((el) => opacityOf(el) < 1 || !isIdentity(el.style.transform));
    expect(moving.length).toBeGreaterThan(0);

    motion?.intro.progress(1);
    parts.forEach((el, i) => {
      const name = el.getAttribute("data-part") ?? `bag ${el.getAttribute("data-bag")}`;
      const hiddenInSource = name === "rice-green" || el.getAttribute("opacity") === "0";
      expect(opacityOf(el), `${slug} ${name} opacity`).toBe(hiddenInSource ? 0 : 1);
      expect(el.getAttribute("transform"), `${slug} ${name} transform attribute`).toBe(sourceTransforms[i]);
      // A part that the final frame hides may rest anywhere (the bag's air ends 24 px up).
      if (hiddenInSource) return;
      expect(isIdentity(el.style.transform), `${slug} ${name} transform "${el.style.transform}"`).toBe(true);
    });
  });

  it("nang-mua-gio: the rice starts green and ends gold", () => {
    const svg = mount("nang-mua-gio");
    const green = svg.querySelector("[data-part='rice-green']") as SVGElement;
    const gold = svg.querySelector("[data-part='rice-gold']") as SVGElement;
    const motion = SCENE_MOTIONS["nang-mua-gio"](gsap, svg);
    motion?.intro.progress(0);
    expect(opacityOf(green)).toBe(1);
    expect(opacityOf(gold)).toBe(0);
    motion?.intro.progress(1);
    expect(opacityOf(green)).toBe(0);
    expect(opacityOf(gold)).toBe(1);
  });

  it("mam-com: the dishes appear one after the other, in order", () => {
    const svg = mount("mam-com");
    const dishes = Array.from(svg.querySelectorAll<SVGElement>("[data-part='dish']"));
    const motion = SCENE_MOTIONS["mam-com"](gsap, svg);
    const shownAt = dishes.map(() => Infinity);
    const duration = motion?.intro.duration() ?? 0;
    for (let k = 0; k <= 100; k++) {
      motion?.intro.progress(k / 100);
      dishes.forEach((dish, i) => {
        if (opacityOf(dish) >= 0.5 && shownAt[i] === Infinity) shownAt[i] = (k / 100) * duration;
      });
    }
    expect(shownAt.every(Number.isFinite)).toBe(true);
    expect([...shownAt].sort((a, b) => a - b)).toEqual(shownAt);
    expect(new Set(shownAt).size).toBe(4);
  });

  it("dong-goi: the bag motion is nested in the intro and the lid closes before the bag shrinks", () => {
    const svg = mount("dong-goi");
    const motion = SCENE_MOTIONS["dong-goi"](gsap, svg);
    const nested = motion?.intro.getChildren(false, false, true) ?? [];
    expect(nested.length).toBeGreaterThan(0);
    const lid = svg.querySelector("[data-part='lid']") as SVGElement;
    // The bag motion starts at 0: it unpacks until 0.5 s and starts to shrink at 1.4 s.
    motion?.intro.time(0.3);
    expect(isIdentity(lid.style.transform)).toBe(false);
    motion?.intro.time(1.4);
    expect(isIdentity(lid.style.transform)).toBe(true);
  });

  it.each(SLUGS.flatMap((slug) => [...PARTS[slug].once, ...PARTS[slug].loop].map((part) => [slug, part])))(
    "%s: returns null without the %s part",
    (slug, part) => {
      const svg = mount(slug as SceneSlug);
      svg.querySelectorAll(`[data-part='${part}']`).forEach((el) => el.remove());
      expect(SCENE_MOTIONS[slug as SceneSlug](gsap, svg)).toBeNull();
    },
  );

  it("dong-goi: returns null without a bag group", () => {
    const svg = mount("dong-goi");
    svg.querySelector("[data-bag='seal']")?.remove();
    expect(SCENE_MOTIONS["dong-goi"](gsap, svg)).toBeNull();
  });

  it.each(SLUGS)("%s: sets only transform and opacity properties", (slug) => {
    const svg = mount(slug);
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
    SCENE_MOTIONS[slug](gsap, svg);
    const keys = new Set(vars.flatMap((v) => Object.keys(v)));
    expect(keys.size).toBeGreaterThan(0);
    for (const key of keys) {
      expect(ALLOWED_PROPS.has(key) || CONTROL_KEYS.has(key), `${slug}: ${key}`).toBe(true);
    }
  });
});

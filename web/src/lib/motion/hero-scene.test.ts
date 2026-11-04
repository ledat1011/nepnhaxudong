import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GsapModules } from "./load-gsap";
import {
  CLOUD_LAPS,
  GUST_MAX_DEG,
  GUST_SWINGS,
  HERO_CYCLE_S,
  SUN_BOBS,
  cloudOffset,
  heroFrame,
  setupHeroScene,
} from "./hero-scene";

const STARTS = [0.08, 0.42, 0.74];
const GUSTS = 5;

describe("heroFrame", () => {
  it("is the same frame at the start and the end of the cycle", () => {
    const a = heroFrame(0, STARTS, GUSTS);
    const b = heroFrame(1, STARTS, GUSTS);
    expect(a.rays % 360).toBeCloseTo(b.rays % 360, 9);
    expect(a.sunY).toBeCloseTo(b.sunY, 9);
    expect(a.mascotRiceSkew).toBeCloseTo(b.mascotRiceSkew, 9);
    a.clouds.forEach((c, i) => expect(c).toBeCloseTo(b.clouds[i], 9));
    a.gusts.forEach((g, i) => expect(g).toBeCloseTo(b.gusts[i], 9));
  });

  it("keeps every cloud at its static place at t = 0", () => {
    expect(heroFrame(0, STARTS, GUSTS).clouds.every((c) => c === 0)).toBe(true);
  });

  it("moves each cloud a whole number of laps", () => {
    STARTS.forEach((s, i) => expect(cloudOffset(1, s, CLOUD_LAPS[i])).toBeCloseTo(0, 9));
  });

  it("jumps a cloud only when it is off screen", () => {
    const steps = 6000;
    STARTS.forEach((start, i) => {
      let previous = cloudOffset(0, start, CLOUD_LAPS[i]);
      for (let k = 1; k <= steps; k++) {
        const current = cloudOffset(k / steps, start, CLOUD_LAPS[i]);
        if (current < previous) {
          expect(start + previous).toBeGreaterThanOrEqual(0.999);
          expect(start + current).toBeLessThanOrEqual(0.001);
        }
        previous = current;
      }
    });
  });

  it("keeps every gust within the maximum angle", () => {
    for (let k = 0; k <= 1000; k++) {
      heroFrame(k / 1000, STARTS, GUSTS).gusts.forEach((g) =>
        expect(Math.abs(g)).toBeLessThanOrEqual(GUST_MAX_DEG + 1e-9),
      );
    }
  });

  it("lets the wind move from left to right", () => {
    // Group 0 peaks at GUST_SWINGS * t = 0.25 (mod 1); group 1 peaks later.
    const t0 = 0.25 / GUST_SWINGS;
    const f = heroFrame(t0, STARTS, GUSTS);
    expect(f.gusts[0]).toBeCloseTo(GUST_MAX_DEG, 9);
    expect(f.gusts[1]).toBeLessThan(GUST_MAX_DEG - 1e-6);
    const later = heroFrame(t0 + 0.12 / GUST_SWINGS, STARTS, GUSTS);
    expect(later.gusts[1]).toBeCloseTo(GUST_MAX_DEG, 9);
  });

  it("periods divide the cycle", () => {
    expect(HERO_CYCLE_S).toBe(60);
    expect(Number.isInteger(GUST_SWINGS)).toBe(true);
    expect(Number.isInteger(SUN_BOBS)).toBe(true);
    CLOUD_LAPS.forEach((l) => expect(Number.isInteger(l)).toBe(true));
  });
});

// ---------------------------------------------------------------------------------------------

const controller = vi.hoisted(() => {
  const entry = { setVisible: vi.fn(), remove: vi.fn() };
  return { entry, add: vi.fn(() => entry) };
});
vi.mock("./loops", () => ({ getLoopController: () => ({ add: controller.add }) }));

function fakeModules() {
  const tween = { play: vi.fn(), pause: vi.fn(), kill: vi.fn() };
  const setters = new Map<string, ReturnType<typeof vi.fn>>();
  let onToggle: ((self: { isActive: boolean }) => void) | undefined;
  const trigger = { kill: vi.fn() };
  const gsap = {
    set: vi.fn(),
    to: vi.fn(() => tween),
    quickSetter: vi.fn((target: Element, prop: string) => {
      const fn = vi.fn();
      setters.set(`${target.getAttribute("data-key") ?? target.id}:${prop}`, fn);
      return fn;
    }),
  };
  const ScrollTrigger = {
    create: vi.fn((vars: { onToggle: (self: { isActive: boolean }) => void }) => {
      onToggle = vars.onToggle;
      return trigger;
    }),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  };
  return {
    modules: { gsap, ScrollTrigger } as unknown as GsapModules,
    gsap,
    ScrollTrigger,
    tween,
    trigger,
    setters,
    toggle: (isActive: boolean) => onToggle?.({ isActive }),
  };
}

const SCENE = `
<section data-hero-scene="">
  <div data-hero-panel=""><div id="strip">
    <svg data-hero-cloud="" data-key="c0"></svg><svg data-hero-cloud="" data-key="c1"></svg><svg data-hero-cloud="" data-key="c2"></svg>
  </div></div>
  <svg><g data-hero-sun-rays="" data-key="rays"></g><g data-hero-sun="" data-key="sun"></g></svg>
  <svg><g data-hero-gust="" data-key="g0"></g><g data-hero-gust="" data-key="g1"></g><g data-hero-gust="" data-key="g2"></g><g data-hero-gust="" data-key="g3"></g><g data-hero-gust="" data-key="g4"></g></svg>
  <svg data-mascot=""><g id="rice"></g></svg>
</section>`;

describe("setupHeroScene", () => {
  beforeEach(() => {
    controller.add.mockClear();
    controller.entry.setVisible.mockClear();
    controller.entry.remove.mockClear();
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does nothing without [data-hero-scene]", () => {
    const fake = fakeModules();
    expect(setupHeroScene(fake.modules, document)).toBeUndefined();
    expect(fake.gsap.to).not.toHaveBeenCalled();
    expect(controller.add).not.toHaveBeenCalled();
  });

  it("registers one paused loop and plays it when the hero is visible", () => {
    document.body.innerHTML = SCENE;
    const fake = fakeModules();
    setupHeroScene(fake.modules, document);
    expect(fake.gsap.to).toHaveBeenCalledTimes(1);
    expect(fake.gsap.to).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ t: 1, duration: HERO_CYCLE_S, ease: "none", repeat: -1, paused: true }),
    );
    expect(controller.add).toHaveBeenCalledTimes(1);
    expect(controller.add).toHaveBeenCalledWith(fake.tween);
    expect(fake.ScrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({ start: "top bottom", end: "bottom top" }),
    );
    fake.toggle(true);
    expect(controller.entry.setVisible).toHaveBeenLastCalledWith(true);
    fake.toggle(false);
    expect(controller.entry.setVisible).toHaveBeenLastCalledWith(false);
  });

  it("stays paused when the controller is paused", () => {
    document.body.innerHTML = SCENE;
    const fake = fakeModules();
    setupHeroScene(fake.modules, document);
    // Only the controller plays the tween, so a paused controller keeps it paused.
    fake.toggle(true);
    expect(fake.tween.play).not.toHaveBeenCalled();
  });

  it("removes the loop on cleanup", () => {
    document.body.innerHTML = SCENE;
    const fake = fakeModules();
    const cleanup = setupHeroScene(fake.modules, document);
    expect(typeof cleanup).toBe("function");
    (cleanup as () => void)();
    expect(controller.entry.remove).toHaveBeenCalledTimes(1);
    expect(fake.trigger.kill).toHaveBeenCalled();
    expect(fake.ScrollTrigger.removeEventListener).toHaveBeenCalled();
  });

  it("skews, not rotates, the mascot rice", () => {
    document.body.innerHTML = SCENE;
    const fake = fakeModules();
    setupHeroScene(fake.modules, document);
    const rice = document.getElementById("rice");
    expect(fake.gsap.quickSetter).toHaveBeenCalledWith(rice, "skewX", "deg");
    const props = fake.gsap.quickSetter.mock.calls
      .filter(([target]) => target === rice)
      .map(([, prop]) => prop);
    expect(props).toEqual(["skewX"]);
  });

  it("writes a frame to every setter on update", () => {
    document.body.innerHTML = SCENE;
    const fake = fakeModules();
    setupHeroScene(fake.modules, document);
    const [proxy, vars] = fake.gsap.to.mock.calls[0] as unknown as [
      { t: number },
      { onUpdate: () => void },
    ];
    proxy.t = 0.25 / GUST_SWINGS;
    vars.onUpdate();
    expect(fake.setters.get("g0:rotation")).toHaveBeenLastCalledWith(expect.closeTo(GUST_MAX_DEG, 6));
    expect(fake.setters.get("rays:rotation")).toHaveBeenCalled();
    expect(fake.setters.get("sun:y")).toHaveBeenCalled();
    expect(fake.setters.get("c0:x")).toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GsapModules } from "../load-gsap";
import { roadBend, roadPoint } from "@/lib/story/road";
import { STORY_SCENES } from "@/lib/story/scenes";
import {
  setupRiceStory,
  STORY_INTRO_LINE,
  STORY_LOAD_AHEAD,
  STORY_ROAD_LINE,
  throttledLoop,
} from "./rice-story";
import { LOOP_UPDATES_PER_S } from "../throttle";

const mocks = vi.hoisted(() => ({
  buildOverlay: vi.fn(),
  showOverlay: vi.fn(),
  build: vi.fn(),
  add: vi.fn(),
}));

vi.mock("@/lib/story/overlay", () => ({
  buildOverlay: mocks.buildOverlay,
  showOverlay: mocks.showOverlay,
}));
vi.mock("./scene-motions", async () => {
  const { STORY_SCENES: scenes } = await import("@/lib/story/scenes");
  const known = new Set<string | symbol>(scenes.map((s) => s.slug));
  return { SCENE_MOTIONS: new Proxy({}, { get: (_, slug) => (known.has(slug) ? mocks.build : undefined) }) };
});
vi.mock("../loops", () => ({ getLoopController: () => ({ add: mocks.add }) }));

type Vars = Record<string, unknown> & {
  onEnter?: () => void;
  onToggle?: (self: { isActive: boolean }) => void;
  onUpdate?: () => void;
};
type FakeTrigger = { vars: Vars; kill: ReturnType<typeof vi.fn>; isActive: boolean };
type FakeTween = { target: Record<string, number>; vars: Vars & { scrollTrigger?: Vars } };

function fakeModules() {
  const triggers: FakeTrigger[] = [];
  const tweens: FakeTween[] = [];
  const sets: Array<{ target: unknown; vars: Record<string, unknown> }> = [];
  const written = new Map<Element, Record<string, number>>();
  const listeners: Record<string, Array<() => void>> = {};
  const contextRevert = vi.fn();
  const ScrollTrigger = {
    create: vi.fn((vars: Vars) => {
      const t: FakeTrigger = { vars, kill: vi.fn(), isActive: false };
      triggers.push(t);
      return t;
    }),
    addEventListener: vi.fn((type: string, fn: () => void) => {
      (listeners[type] ??= []).push(fn);
    }),
    removeEventListener: vi.fn((type: string, fn: () => void) => {
      listeners[type] = (listeners[type] ?? []).filter((f) => f !== fn);
    }),
  };
  const gsap = {
    context: vi.fn((fn?: () => void) => {
      fn?.();
      return { add: (f: () => void) => f(), revert: contextRevert };
    }),
    matchMedia: vi.fn(),
    to: vi.fn((target: Record<string, number>, vars: FakeTween["vars"]) => {
      tweens.push({ target, vars });
      return { kill: vi.fn() };
    }),
    set: vi.fn((target: unknown, vars: Record<string, unknown>) => {
      sets.push({ target, vars });
    }),
    quickSetter: vi.fn((el: Element, prop: string) => (value: number) => {
      written.set(el, { ...written.get(el), [prop]: value });
    }),
    ticker: { add: vi.fn(), remove: vi.fn() },
  };
  return {
    modules: { gsap, ScrollTrigger } as unknown as GsapModules,
    gsap,
    ScrollTrigger,
    triggers,
    tweens,
    sets,
    written,
    contextRevert,
    fire: (type: string) => (listeners[type] ?? []).slice().forEach((fn) => fn()),
  };
}

function fakeMotion(withLoop = true) {
  const callbacks: Record<string, () => void> = {};
  return {
    intro: {
      play: vi.fn(),
      progress: vi.fn(),
      eventCallback: vi.fn((type: string, fn: () => void) => {
        callbacks[type] = fn;
      }),
    },
    loop: withLoop ? { totalTime: vi.fn(() => 0), play: vi.fn(), pause: vi.fn() } : null,
    complete: () => callbacks.onComplete?.(),
  };
}

const MARKUP = `
  <section data-rice-story>
    <a href="#sau-cau-chuyen" data-story-skip>skip</a>
    <div data-story-road-wrap>
      <span data-story-grain aria-hidden="true"></span>
      <ol data-story-list>${STORY_SCENES.map(
        (s, i) => `<li data-story-scene="${s.slug}">
          <span data-story-road data-bend="${roadBend(i)}" aria-hidden="true">
            <svg></svg><span data-story-road-passed><span></span></span>
          </span>
          <span data-story-stop aria-hidden="true"></span>
          <div data-story-stage><img src="${s.src}" alt=""></div><h3>t</h3></li>`,
      ).join("")}</ol>
    </div>
    <div id="sau-cau-chuyen" tabindex="-1"></div>
  </section>`;

const items = () => Array.from(document.querySelectorAll<HTMLElement>("li[data-story-scene]"));
const wrap = () => document.querySelector("[data-story-road-wrap]") as HTMLElement;
const SCENE_H = 600;
const ROAD_LEFT = 0;
const ROAD_W = 40;
const STOP = 14;

/** Places the list `top` px from the top of the screen; each scene is 600 px high. */
function place(top: number) {
  const rect = (t: number, h: number, l = 0, w = 400) =>
    ({ top: t, bottom: t + h, left: l, right: l + w, width: w, height: h, x: l, y: t }) as DOMRect;
  wrap().getBoundingClientRect = () => rect(top, SCENE_H * 8);
  items().forEach((li, i) => {
    li.getBoundingClientRect = () => rect(top + i * SCENE_H, SCENE_H);
    const road = li.querySelector("[data-story-road]") as HTMLElement;
    road.getBoundingClientRect = () => rect(top + i * SCENE_H + STOP, SCENE_H, ROAD_LEFT, ROAD_W);
  });
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

/** The overlay `buildOverlay` would add: a root in the stage, no parts. */
function overlayIn(stage: HTMLElement) {
  const root = document.createElement("div");
  root.setAttribute("data-story-overlay", "");
  stage.append(root);
  return { root, parts: {}, effects: document.createElementNS("http://www.w3.org/2000/svg", "svg") };
}

const stageOf = (slug: string) =>
  document.querySelector<HTMLElement>(`li[data-story-scene='${slug}'] [data-story-stage]`)!;

const loadTriggers = (fake: ReturnType<typeof fakeModules>) =>
  fake.triggers.filter((t) => t.vars.start === STORY_LOAD_AHEAD);

/** Runs every scene's load trigger and waits for the (mocked) overlays. */
async function load(fake: ReturnType<typeof fakeModules>) {
  loadTriggers(fake).forEach((t) => t.vars.onEnter?.());
  await flush();
}

const introStart = () => `clamp(top ${STORY_INTRO_LINE * 100}%)`;
const roadLine = () => `${STORY_ROAD_LINE * 100}%`;
let motions: ReturnType<typeof fakeMotion>[] = [];

beforeEach(() => {
  document.body.innerHTML = MARKUP;
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  place(2000);
  motions = [];
  mocks.buildOverlay.mockReset();
  mocks.buildOverlay.mockImplementation(async (stage: HTMLElement) => overlayIn(stage));
  mocks.showOverlay.mockReset();
  mocks.build.mockReset();
  mocks.build.mockImplementation(() => {
    const motion = fakeMotion();
    motions.push(motion);
    return motion;
  });
  mocks.add.mockReset();
  mocks.add.mockImplementation(() => ({ setVisible: vi.fn(), remove: vi.fn() }));
});

afterEach(() => {
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

describe("setupRiceStory", () => {
  it("does nothing without the story section", () => {
    document.body.innerHTML = "<main></main>";
    const fake = fakeModules();
    expect(setupRiceStory(fake.modules, document)).toBeUndefined();
    expect(fake.ScrollTrigger.create).not.toHaveBeenCalled();
    expect(fake.gsap.to).not.toHaveBeenCalled();
  });

  it("loads each scene's moving parts once, one screen before the scene", async () => {
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    expect(STORY_LOAD_AHEAD).toBe("top bottom+=100%");
    const triggers = loadTriggers(fake);
    expect(triggers).toHaveLength(8);
    triggers.forEach((t, i) => expect(t.vars).toMatchObject({ trigger: items()[i], once: true }));
    expect(mocks.buildOverlay).not.toHaveBeenCalled();
    // Only the scene that comes near loads; the others wait for their own trigger.
    triggers[0].vars.onEnter?.();
    await flush();
    expect(mocks.buildOverlay).toHaveBeenCalledTimes(1);
    expect(mocks.buildOverlay).toHaveBeenCalledWith(stageOf(STORY_SCENES[0].slug), STORY_SCENES[0].slug);
    expect(mocks.build).toHaveBeenCalledTimes(1);
    triggers.slice(1).forEach((t) => t.vars.onEnter?.());
    await flush();
    expect(mocks.buildOverlay).toHaveBeenCalledTimes(8);
  });

  it("shows each overlay only after its intro has set its first or last frame", async () => {
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    await load(fake);
    expect(mocks.showOverlay).toHaveBeenCalledTimes(8);
    const order = mocks.showOverlay.mock.invocationCallOrder[0];
    expect(fake.ScrollTrigger.create.mock.invocationCallOrder.some((n) => n < order)).toBe(true);
  });

  it("never pins and never uses a sideways container animation", async () => {
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    await load(fake);
    expect(fake.gsap.matchMedia).not.toHaveBeenCalled();
    const all = [
      ...fake.triggers.map((t) => t.vars),
      ...fake.tweens.map((t) => t.vars.scrollTrigger ?? {}),
    ];
    for (const vars of all) {
      expect(vars.pin).toBeUndefined();
      expect(vars.containerAnimation).toBeUndefined();
    }
    expect(document.querySelector("[data-rice-story]")?.hasAttribute("data-story-mode")).toBe(false);
  });

  it("plays each intro once when its scene reaches 75 % of the screen", async () => {
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    await load(fake);
    expect(STORY_INTRO_LINE).toBe(0.75);
    expect(mocks.build).toHaveBeenCalledTimes(8);
    const intros = fake.triggers.filter((t) => t.vars.start === introStart());
    expect(intros).toHaveLength(8);
    intros.forEach((t, i) => {
      expect(t.vars).toMatchObject({ trigger: items()[i], once: true });
      expect(motions[i].intro.play).not.toHaveBeenCalled();
      t.vars.onEnter?.();
      expect(motions[i].intro.play).toHaveBeenCalledTimes(1);
    });
  });

  it("shows the final frame at once for a scene that is already past its line", async () => {
    place(-6000);
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    await load(fake);
    motions.forEach((m) => {
      expect(m.intro.progress).toHaveBeenCalledWith(1);
      expect(m.intro.play).not.toHaveBeenCalled();
    });
    expect(fake.triggers.filter((t) => t.vars.start === introStart())).toHaveLength(0);
  });

  it("runs a loop only while its scene is on screen and after its intro", async () => {
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    await load(fake);
    expect(mocks.add).toHaveBeenCalledTimes(8);
    const entry = mocks.add.mock.results[0].value as { setVisible: ReturnType<typeof vi.fn> };
    const loopTrigger = fake.triggers.find(
      (t) => t.vars.trigger === items()[0] && t.vars.start === "top bottom",
    );
    expect(loopTrigger?.vars.end).toBe("bottom top");
    loopTrigger?.vars.onToggle?.({ isActive: true });
    expect(entry.setVisible).not.toHaveBeenCalledWith(true);
    motions[0].complete();
    expect(entry.setVisible).toHaveBeenLastCalledWith(true);
    loopTrigger?.vars.onToggle?.({ isActive: false });
    expect(entry.setVisible).toHaveBeenLastCalledWith(false);
  });

  it("registers no loop for a scene without one", async () => {
    mocks.build.mockImplementation(() => {
      const motion = fakeMotion(false);
      motions.push(motion);
      return motion;
    });
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    await load(fake);
    expect(mocks.add).not.toHaveBeenCalled();
    expect(fake.triggers.filter((t) => t.vars.start === "top bottom")).toHaveLength(0);
  });

  it("fills the stop of the scene in the middle of the screen", () => {
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    const stops = Array.from(document.querySelectorAll("[data-story-stop]"));
    const triggers = fake.triggers.filter((t) => t.vars.start === `top ${roadLine()}`);
    expect(triggers).toHaveLength(8);
    triggers.forEach((t, i) =>
      expect(t.vars).toMatchObject({
        trigger: items()[i].querySelector("[data-story-road]"),
        end: `bottom ${roadLine()}`,
      }),
    );
    triggers[2].vars.onToggle?.({ isActive: true });
    expect(stops[2].hasAttribute("data-active")).toBe(true);
    triggers[2].vars.onToggle?.({ isActive: false });
    expect(stops[2].hasAttribute("data-active")).toBe(false);
  });

  describe("the grain on the road", () => {
    function road() {
      const fake = fakeModules();
      const cleanup = setupRiceStory(fake.modules, document);
      const follow = fake.tweens.find((t) => t.vars.scrollTrigger?.trigger === wrap());
      const grain = document.querySelector("[data-story-grain]") as Element;
      const passed = Array.from(document.querySelectorAll("[data-story-road-passed]"));
      /** Moves the scroll-linked proxy to `part` of the road and draws. */
      const at = (part: number) => {
        if (!follow) throw new Error("no road tween");
        for (const key of Object.keys(follow.target)) follow.target[key] = part;
        follow.vars.onUpdate?.();
      };
      return { fake, cleanup, follow, grain, passed, at };
    }

    it("follows the scroll with a scrubbed tween on the road, not a pin", () => {
      const { follow } = road();
      expect(follow?.vars.ease).toBe("none");
      expect(follow?.vars.scrollTrigger).toMatchObject({
        start: `top ${roadLine()}`,
        end: `bottom ${roadLine()}`,
      });
      expect(Number(follow?.vars.scrollTrigger?.scrub)).toBeGreaterThan(0);
    });

    it("shows the grain and the passed layer only when the motion runs", () => {
      const { fake, grain, passed } = road();
      const shownGrain = fake.sets.some((s) => s.target === grain && s.vars.opacity === 1);
      expect(shownGrain).toBe(true);
      // The layer hint comes with the motion, not with the static markup.
      expect(fake.sets.some((s) => s.target === grain && s.vars.willChange === "transform")).toBe(true);
      const shownPassed = fake.sets.some(
        (s) =>
          Array.isArray(s.target) &&
          (s.target as Element[]).includes(passed[0]) &&
          s.vars.opacity === 1,
      );
      expect(shownPassed).toBe(true);
    });

    it("puts the grain on the road at the height the scroll has reached", () => {
      const { fake, grain, at } = road();
      // Half way down the third scene's stretch.
      const y = STOP + 2.5 * SCENE_H;
      at(2.5 / 8);
      const point = roadPoint(roadBend(2), 0.5);
      const written = fake.written.get(grain) ?? {};
      expect(written.y).toBeCloseTo(y, 0);
      expect(written.x).toBeCloseTo(ROAD_LEFT + (point.x / 100) * ROAD_W, 0);
    });

    it("darkens the road above the grain: whole stretches above, part of the current one", () => {
      const { fake, passed, at } = road();
      at(2.25 / 8);
      const reveal = (i: number) => fake.written.get(passed[i])?.yPercent;
      const inner = (i: number) => fake.written.get(passed[i].firstElementChild as Element)?.yPercent;
      expect(reveal(0)).toBeCloseTo(0);
      expect(reveal(1)).toBeCloseTo(0);
      expect(reveal(2)).toBeCloseTo(-75);
      expect(inner(2)).toBeCloseTo(75);
      expect(reveal(5)).toBeCloseTo(-100);
    });

    it("starts the grain at the first stop and ends it at the end of the road", () => {
      const { fake, grain, at } = road();
      at(0);
      expect(fake.written.get(grain)?.y).toBeCloseTo(STOP, 0);
      at(1);
      expect(fake.written.get(grain)?.y).toBeCloseTo(STOP + 8 * SCENE_H, 0);
    });

    it("measures the road again after every refresh", () => {
      const { fake, grain, at } = road();
      expect(fake.ScrollTrigger.addEventListener).toHaveBeenCalledWith("refresh", expect.any(Function));
      // The page above grew: everything is 300 px lower, relative to the road nothing moved.
      place(2300);
      fake.fire("refresh");
      at(0);
      expect(fake.written.get(grain)?.y).toBeCloseTo(STOP, 0);
    });
  });

  it("removes every loop, stop fill and listener on cleanup", async () => {
    const fake = fakeModules();
    const cleanup = setupRiceStory(fake.modules, document);
    await load(fake);
    const stop = document.querySelector("[data-story-stop]") as HTMLElement;
    stop.setAttribute("data-active", "");
    const entries = mocks.add.mock.results.map((r) => r.value as { remove: ReturnType<typeof vi.fn> });
    expect(entries).toHaveLength(8);
    (cleanup as () => void)();
    entries.forEach((e) => expect(e.remove).toHaveBeenCalled());
    loadTriggers(fake).forEach((t) => expect(t.kill).toHaveBeenCalled());
    expect(fake.contextRevert).toHaveBeenCalled();
    expect(stop.hasAttribute("data-active")).toBe(false);
    // Back to the still sketches: no overlay is left in any stage.
    expect(document.querySelectorAll("[data-story-overlay]")).toHaveLength(0);
    expect(fake.ScrollTrigger.removeEventListener).toHaveBeenCalledWith("refresh", expect.any(Function));
  });

  it("keeps the still sketch of a scene whose layers fail and moves the others", async () => {
    mocks.buildOverlay.mockImplementation(async (stage: HTMLElement, slug: string) =>
      slug === "say" ? null : overlayIn(stage),
    );
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    await load(fake);
    expect(mocks.build).toHaveBeenCalledTimes(7);
    const triggered = fake.triggers
      .filter((t) => t.vars.start === introStart())
      .map((t) => t.vars.trigger);
    expect(triggered).toHaveLength(7);
    expect(triggered).not.toContain(document.querySelector("li[data-story-scene='say']"));
  });

  it("skips a scene that lacks a part and removes its overlay", async () => {
    mocks.build.mockImplementationOnce(() => null);
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    await load(fake);
    expect(fake.triggers.filter((t) => t.vars.start === introStart())).toHaveLength(7);
    expect(stageOf(STORY_SCENES[0].slug).querySelector("[data-story-overlay]")).toBeNull();
    expect(document.querySelectorAll("[data-story-overlay]")).toHaveLength(7);
  });

  it("skips a scene whose slug has no motion and moves the others", async () => {
    items()[0].setAttribute("data-story-scene", "not-a-scene");
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    await load(fake);
    expect(mocks.build).toHaveBeenCalledTimes(7);
    expect(fake.triggers.filter((t) => t.vars.start === introStart())).toHaveLength(7);
  });

  it("fills the stop inside each scene, also when a scene above has none", () => {
    items()[0].querySelector("[data-story-stop]")?.remove();
    const fake = fakeModules();
    setupRiceStory(fake.modules, document);
    const fill = fake.triggers.filter((t) => t.vars.start === `top ${roadLine()}`);
    expect(fill.map((t) => t.vars.trigger)).toEqual(
      items()
        .slice(1)
        .map((li) => li.querySelector("[data-story-road]")),
    );
    fill[1].vars.onToggle?.({ isActive: true });
    const active = Array.from(document.querySelectorAll("[data-story-stop][data-active]"));
    expect(active).toEqual([items()[2].querySelector("[data-story-stop]")]);
  });

  it("measures a scene at the scroll position a pending #hash jump goes to", async () => {
    const target = document.getElementById("sau-cau-chuyen") as HTMLElement;
    // The jump will scroll the page down by 3800 px: scenes 0 to 3 are then above the line.
    target.getBoundingClientRect = () => ({ top: 3800 }) as DOMRect;
    Object.defineProperty(document.documentElement, "scrollHeight", { value: 20000, configurable: true });
    window.history.replaceState(null, "", "/#sau-cau-chuyen");
    try {
      const fake = fakeModules();
      setupRiceStory(fake.modules, document);
      await load(fake);
      const shown = motions.map((m) => m.intro.progress.mock.calls.some(([p]) => p === 1));
      expect(shown).toEqual([true, true, true, true, false, false, false, false]);
      expect(fake.triggers.filter((t) => t.vars.start === introStart())).toHaveLength(4);
    } finally {
      window.history.replaceState(null, "", "/");
    }
  });

  it("drops the overlays that arrive after cleanup", async () => {
    const fake = fakeModules();
    const cleanup = setupRiceStory(fake.modules, document);
    loadTriggers(fake).forEach((t) => t.vars.onEnter?.());
    (cleanup as () => void)();
    await flush();
    expect(mocks.build).not.toHaveBeenCalled();
    expect(document.querySelectorAll("[data-story-overlay]")).toHaveLength(0);
  });
});

describe("throttledLoop", () => {
  it(`steps the loop at most ${LOOP_UPDATES_PER_S} times a second, only while it plays`, () => {
    let time = 0;
    const loop = { totalTime: vi.fn((t?: number) => (t === undefined ? time : ((time = t), loop))) };
    const ticker = { add: vi.fn(), remove: vi.fn() };
    const playback = throttledLoop({ ticker } as unknown as GsapModules["gsap"], loop as never);
    expect(ticker.add).not.toHaveBeenCalled();
    playback.play();
    const tick = ticker.add.mock.calls[0][0] as (t: number) => void;
    tick(10);
    expect(time).toBe(0);
    tick(10 + 1 / 60);
    expect(time).toBe(0);
    tick(10 + 2 / 60);
    expect(time).toBeCloseTo(2 / 60, 5);
    playback.pause();
    expect(ticker.remove).toHaveBeenCalledWith(tick);
    playback.play();
    // A pause does not count as loop time.
    const next = ticker.add.mock.calls[1][0] as (t: number) => void;
    next(50);
    next(50 + 1 / 30);
    expect(time).toBeCloseTo(2 / 60 + 1 / 30, 5);
  });
});

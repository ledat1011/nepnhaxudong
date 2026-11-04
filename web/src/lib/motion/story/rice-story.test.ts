import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { GsapModules } from "../load-gsap";
import { STORY_SCENES } from "@/lib/story/scenes";
import {
  setupRiceStory,
  STORY_DESKTOP_QUERY,
  STORY_LOAD_AHEAD,
  STORY_LOOP_UPDATES_PER_S,
  STORY_PHONE_QUERY,
  STORY_PIN_SCREENS,
  throttledLoop,
} from "./rice-story";

const mocks = vi.hoisted(() => ({
  inlineSvg: vi.fn(),
  build: vi.fn(),
  add: vi.fn(),
}));

vi.mock("./inline-svg", () => ({ inlineSvg: mocks.inlineSvg }));
vi.mock("./scene-motions", () => ({
  SCENE_MOTIONS: new Proxy({}, { get: () => mocks.build }),
}));
vi.mock("../loops", () => ({ getLoopController: () => ({ add: mocks.add }) }));

type Vars = Record<string, unknown> & {
  onEnter?: () => void;
  onToggle?: (self: { isActive: boolean }) => void;
};
type FakeTrigger = { vars: Vars; kill: ReturnType<typeof vi.fn>; isActive: boolean; start: number; end: number; scroll: () => number };
type FakeTween = { target: unknown; vars: Vars & { scrollTrigger: Vars }; scrollTrigger: FakeTrigger; kill: () => void };

function fakeModules(screen: "desktop" | "phone") {
  const triggers: FakeTrigger[] = [];
  const tweens: FakeTween[] = [];
  const reverts: Array<() => void> = [];
  const listeners: Record<string, Array<() => void>> = {};
  const ScrollTrigger = {
    create: vi.fn((vars: Vars) => {
      const t: FakeTrigger = { vars, kill: vi.fn(), isActive: false, start: 0, end: 1000, scroll: () => 0 };
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
  const modeAtTween: Array<string | undefined> = [];
  const gsap = {
    matchMedia: vi.fn(() => {
      const cleanups: Array<() => void> = [];
      return {
        add: (query: string, fn: (context: { add: (f: () => void) => void }) => (() => void) | void) => {
          const matches = query === (screen === "desktop" ? STORY_DESKTOP_QUERY : STORY_PHONE_QUERY);
          if (!matches) return;
          const cleanup = fn({ add: (f) => f() });
          if (cleanup) cleanups.push(cleanup);
        },
        revert: vi.fn(() => {
          cleanups.splice(0).forEach((c) => c());
          reverts.forEach((r) => r());
        }),
      };
    }),
    to: vi.fn((target: unknown, vars: FakeTween["vars"]) => {
      modeAtTween.push(document.querySelector<HTMLElement>("[data-rice-story]")?.dataset.storyMode);
      const scrollTrigger: FakeTrigger = { vars: vars.scrollTrigger, kill: vi.fn(), isActive: false, start: 1000, end: 5000, scroll: () => 0 };
      const tween = { target, vars, scrollTrigger, kill: vi.fn() };
      tweens.push(tween);
      return tween;
    }),
    ticker: { add: vi.fn(), remove: vi.fn() },
  };
  return {
    modules: { gsap, ScrollTrigger } as unknown as GsapModules,
    gsap,
    ScrollTrigger,
    triggers,
    tweens,
    modeAtTween,
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
  <header style="height:60px"></header>
  <section data-rice-story>
    <div data-story-pin>
      <a href="#sau-cau-chuyen" data-story-skip>skip</a>
      <ol data-story-progress aria-hidden="true">${STORY_SCENES.map(() => "<li></li>").join("")}</ol>
      <div data-story-viewport>
        <ol data-story-track>${STORY_SCENES.map(
          (s) => `<li data-story-scene="${s.slug}"><img src="${s.src}" alt=""><h3>t</h3></li>`,
        ).join("")}</ol>
      </div>
    </div>
    <div id="sau-cau-chuyen" tabindex="-1"></div>
  </section>`;

const items = () => Array.from(document.querySelectorAll<HTMLElement>("li[data-story-scene]"));
const section = () => document.querySelector("[data-rice-story]") as HTMLElement;

/** Places every scene: `top` of the scene list on screen, scene i at `i * 900` px to the right. */
function place(top: number) {
  items().forEach((li, i) => {
    li.getBoundingClientRect = () => ({ top, bottom: top + 600, left: 16 + i * 900, right: 16 + i * 900 + 880 }) as DOMRect;
  });
  (document.querySelector("[data-story-track]") as HTMLElement).getBoundingClientRect = () =>
    ({ top, left: 16 }) as DOMRect;
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function svgFor(slug: string) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("data-scene", slug);
  return svg;
}

/** Runs the load trigger and waits for the (mocked) inline swaps. */
async function load(fake: ReturnType<typeof fakeModules>) {
  const trigger = fake.triggers.find((t) => t.vars.start === STORY_LOAD_AHEAD);
  trigger?.vars.onEnter?.();
  await flush();
}

let motions: ReturnType<typeof fakeMotion>[] = [];

beforeEach(() => {
  document.body.innerHTML = MARKUP;
  Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
  Object.defineProperty(window, "innerWidth", { value: 1280, configurable: true });
  place(2000);
  motions = [];
  mocks.inlineSvg.mockReset();
  mocks.inlineSvg.mockImplementation(async (img: HTMLImageElement) => {
    const slug = img.closest("li")?.getAttribute("data-story-scene") ?? "";
    return svgFor(slug);
  });
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
    const fake = fakeModules("phone");
    expect(setupRiceStory(fake.modules, document)).toBeUndefined();
    expect(fake.ScrollTrigger.create).not.toHaveBeenCalled();
    expect(fake.gsap.matchMedia).not.toHaveBeenCalled();
  });

  it("loads the eight drawings once, one screen before the section", async () => {
    const fake = fakeModules("phone");
    setupRiceStory(fake.modules, document);
    expect(STORY_LOAD_AHEAD).toBe("top bottom+=100%");
    const trigger = fake.triggers.find((t) => t.vars.start === STORY_LOAD_AHEAD);
    expect(trigger?.vars).toMatchObject({ trigger: section(), once: true });
    expect(mocks.inlineSvg).not.toHaveBeenCalled();
    await load(fake);
    expect(mocks.inlineSvg).toHaveBeenCalledTimes(8);
  });

  describe("on a phone", () => {
    it("never pins and keeps the vertical list", async () => {
      const fake = fakeModules("phone");
      setupRiceStory(fake.modules, document);
      await load(fake);
      expect(fake.gsap.to).not.toHaveBeenCalled();
      for (const t of fake.triggers) expect(t.vars.pin).toBeUndefined();
      expect(section().dataset.storyMode).toBeUndefined();
    });

    it("plays each intro once when its scene reaches 75 % of the screen", async () => {
      const fake = fakeModules("phone");
      setupRiceStory(fake.modules, document);
      await load(fake);
      expect(mocks.build).toHaveBeenCalledTimes(8);
      const intros = fake.triggers.filter((t) => t.vars.start === "clamp(top 75%)");
      expect(intros).toHaveLength(8);
      intros.forEach((t, i) => {
        expect(t.vars).toMatchObject({ trigger: items()[i], once: true });
        expect(motions[i].intro.play).not.toHaveBeenCalled();
        t.vars.onEnter?.();
        expect(motions[i].intro.play).toHaveBeenCalledTimes(1);
      });
    });

    it("shows the final frame at once for a scene that is already past its line", async () => {
      place(100);
      const fake = fakeModules("phone");
      setupRiceStory(fake.modules, document);
      await load(fake);
      motions.forEach((m) => {
        expect(m.intro.progress).toHaveBeenCalledWith(1);
        expect(m.intro.play).not.toHaveBeenCalled();
      });
      expect(fake.triggers.filter((t) => t.vars.start === "clamp(top 75%)")).toHaveLength(0);
    });

    it("runs a loop only while its scene is on screen and after its intro", async () => {
      const fake = fakeModules("phone");
      setupRiceStory(fake.modules, document);
      await load(fake);
      expect(mocks.add).toHaveBeenCalledTimes(8);
      const entry = mocks.add.mock.results[0].value as { setVisible: ReturnType<typeof vi.fn> };
      const loopTrigger = fake.triggers.find((t) => t.vars.trigger === items()[0] && t.vars.start === "top bottom");
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
      const fake = fakeModules("phone");
      setupRiceStory(fake.modules, document);
      await load(fake);
      expect(mocks.add).not.toHaveBeenCalled();
      expect(fake.triggers.filter((t) => t.vars.start === "top bottom")).toHaveLength(0);
    });
  });

  describe("on a desktop", () => {
    it("switches the section to the horizontal layout before it pins", () => {
      const fake = fakeModules("desktop");
      setupRiceStory(fake.modules, document);
      expect(section().dataset.storyMode).toBe("horizontal");
      expect(fake.modeAtTween).toEqual(["horizontal"]);
    });

    it("pins the story and slides the track sideways with the scroll", () => {
      const fake = fakeModules("desktop");
      setupRiceStory(fake.modules, document);
      const [move] = fake.tweens;
      expect(move.target).toBe(document.querySelector("[data-story-track]"));
      expect(move.vars.ease).toBe("none");
      expect(typeof move.vars.x).toBe("function");
      expect(move.vars.scrollTrigger).toMatchObject({
        trigger: document.querySelector("[data-story-pin]"),
        pin: true,
        start: "top top",
        scrub: 1,
        invalidateOnRefresh: true,
      });
      const end = move.vars.scrollTrigger.end as () => string;
      expect(end()).toBe(`+=${STORY_PIN_SCREENS * 800}`);
    });

    it("ties the scene intros, loops and progress dots to the sideways motion", async () => {
      const fake = fakeModules("desktop");
      setupRiceStory(fake.modules, document);
      await load(fake);
      const [move] = fake.tweens;
      // Scene 1 is in the first frame (left at 16 px), so it starts with the vertical scroll.
      const sideways = fake.triggers.filter((t) => t.vars.start === "left 70%");
      expect(sideways.length).toBe(7);
      sideways.forEach((t) => expect(t.vars).toMatchObject({ containerAnimation: move, once: true }));
      const first = fake.triggers.find((t) => t.vars.trigger === items()[0] && t.vars.start === "clamp(top 75%)");
      expect(first?.vars.containerAnimation).toBeUndefined();

      const loops = fake.triggers.filter((t) => t.vars.start === "left right");
      expect(loops).toHaveLength(8);
      loops.forEach((t) => expect(t.vars).toMatchObject({ containerAnimation: move, end: "right left" }));

      const dots = Array.from(document.querySelectorAll("[data-story-progress] > li"));
      const dotTriggers = fake.triggers.filter((t) => t.vars.start === "left center");
      expect(dotTriggers).toHaveLength(8);
      dotTriggers[2].vars.onToggle?.({ isActive: true });
      expect(dots[2].hasAttribute("data-active")).toBe(true);
      dotTriggers[2].vars.onToggle?.({ isActive: false });
      expect(dots[2].hasAttribute("data-active")).toBe(false);
      for (const t of fake.triggers) {
        if (t.vars.containerAnimation) expect(t.vars.pin).toBeUndefined();
      }
    });

    it("returns to the vertical list when the desktop layout ends", () => {
      const fake = fakeModules("desktop");
      const cleanup = setupRiceStory(fake.modules, document);
      const dot = document.querySelector("[data-story-progress] > li") as HTMLElement;
      dot.setAttribute("data-active", "");
      (cleanup as () => void)();
      expect(section().dataset.storyMode).toBeUndefined();
      expect(section().style.getPropertyValue("--story-header")).toBe("");
      expect(dot.hasAttribute("data-active")).toBe(false);
    });
  });

  it("removes every loop on cleanup", async () => {
    const fake = fakeModules("phone");
    const cleanup = setupRiceStory(fake.modules, document);
    await load(fake);
    const entries = mocks.add.mock.results.map((r) => r.value as { remove: ReturnType<typeof vi.fn> });
    expect(entries).toHaveLength(8);
    (cleanup as () => void)();
    entries.forEach((e) => expect(e.remove).toHaveBeenCalled());
    expect(fake.triggers.find((t) => t.vars.start === STORY_LOAD_AHEAD)?.kill).toHaveBeenCalled();
  });

  it("keeps the static image of a scene whose file fails and moves the others", async () => {
    mocks.inlineSvg.mockImplementation(async (img: HTMLImageElement) => {
      const slug = img.closest("li")?.getAttribute("data-story-scene") ?? "";
      return slug === "say" ? null : svgFor(slug);
    });
    const fake = fakeModules("phone");
    setupRiceStory(fake.modules, document);
    await load(fake);
    expect(mocks.build).toHaveBeenCalledTimes(7);
    const triggered = fake.triggers.filter((t) => t.vars.start === "clamp(top 75%)").map((t) => t.vars.trigger);
    expect(triggered).toHaveLength(7);
    expect(triggered).not.toContain(document.querySelector("li[data-story-scene='say']"));
  });

  it("skips a scene whose drawing lacks a part", async () => {
    mocks.build.mockImplementationOnce(() => null);
    const fake = fakeModules("phone");
    setupRiceStory(fake.modules, document);
    await load(fake);
    expect(fake.triggers.filter((t) => t.vars.start === "clamp(top 75%)")).toHaveLength(7);
  });

  it("does not move the drawings that arrive after cleanup", async () => {
    const fake = fakeModules("phone");
    const cleanup = setupRiceStory(fake.modules, document);
    fake.triggers.find((t) => t.vars.start === STORY_LOAD_AHEAD)?.vars.onEnter?.();
    (cleanup as () => void)();
    await flush();
    expect(mocks.build).not.toHaveBeenCalled();
  });
});

describe("throttledLoop", () => {
  it(`steps the loop at most ${STORY_LOOP_UPDATES_PER_S} times a second, only while it plays`, () => {
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

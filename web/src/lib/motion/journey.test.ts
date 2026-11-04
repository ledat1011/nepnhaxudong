import { afterEach, describe, expect, it, vi } from "vitest";
import { setupJourney } from "./journey";
import type { GsapModules } from "./load-gsap";

const VIEWPORT_HEIGHT = 800;

function fakeModules() {
  const tween = () => ({ play: vi.fn() });
  const gsap = { set: vi.fn(), to: vi.fn(tween), fromTo: vi.fn(tween) };
  const ScrollTrigger = { create: vi.fn() };
  return { modules: { gsap, ScrollTrigger } as unknown as GsapModules, gsap, ScrollTrigger };
}

function rectAt(top: number, height: number) {
  return () => ({ top, bottom: top + height, height }) as DOMRect;
}

/** One timeline event below the screen, with its leaf `leafTop` px below the event top. */
function renderTimeline({ eventTop, leafTop }: { eventTop: number; leafTop: number }) {
  document.body.innerHTML = `
    <div>
      <div data-journey-line></div>
      <ol><li data-journey-event><span><svg data-journey-leaf></svg></span></li></ol>
    </div>`;
  const list = document.querySelector("ol") as HTMLElement;
  const event = document.querySelector("[data-journey-event]") as HTMLElement;
  const leaf = document.querySelector("[data-journey-leaf]") as SVGElement;
  list.getBoundingClientRect = rectAt(eventTop, 600);
  event.getBoundingClientRect = rectAt(eventTop, 600);
  leaf.getBoundingClientRect = rectAt(eventTop + leafTop, 12);
  return event;
}

describe("setupJourney", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("shows an event when the stem tip reaches the point where its leaf joins the stem", () => {
    Object.defineProperty(window, "innerHeight", { value: VIEWPORT_HEIGHT, configurable: true });
    const event = renderTimeline({ eventTop: 1500, leafTop: 40 });
    const fake = fakeModules();
    setupJourney(fake.modules, document);

    // The stem tip follows the 70% line; the leaf joins the stem at its bottom edge.
    expect(fake.ScrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: event, start: "clamp(top+=52 70%)" }),
    );
  });

  it("keeps an event that is in view as it is", () => {
    Object.defineProperty(window, "innerHeight", { value: VIEWPORT_HEIGHT, configurable: true });
    renderTimeline({ eventTop: 300, leafTop: 40 });
    const fake = fakeModules();
    setupJourney(fake.modules, document);

    expect(fake.gsap.set).not.toHaveBeenCalled();
    expect(fake.ScrollTrigger.create).not.toHaveBeenCalled();
  });
});

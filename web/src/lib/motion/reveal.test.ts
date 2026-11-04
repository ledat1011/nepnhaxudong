import { afterEach, describe, expect, it } from "vitest";
import { pendingHashScroll, shouldHideElement, shouldHideOnSetup } from "./reveal";

describe("shouldHideOnSetup", () => {
  it("hides an element below the viewport", () => {
    expect(shouldHideOnSetup({ top: 900 }, 800)).toBe(true);
  });

  it("hides an element whose top is exactly at the bottom edge", () => {
    expect(shouldHideOnSetup({ top: 800 }, 800)).toBe(true);
  });

  it("keeps an element inside the viewport visible", () => {
    expect(shouldHideOnSetup({ top: 400 }, 800)).toBe(false);
  });

  it("keeps an element above the viewport visible", () => {
    expect(shouldHideOnSetup({ top: -300 }, 800)).toBe(false);
  });
});

describe("shouldHideElement", () => {
  function at(top: number) {
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    const el = document.createElement("div");
    el.getBoundingClientRect = () => ({ top }) as DOMRect;
    return el;
  }

  it("uses the bottom of the screen by default", () => {
    expect(shouldHideElement(at(799), 0)).toBe(false);
    expect(shouldHideElement(at(800), 0)).toBe(true);
  });

  it("can use a line higher up in the screen", () => {
    expect(shouldHideElement(at(599), 0, 0.75)).toBe(false);
    expect(shouldHideElement(at(600), 0, 0.75)).toBe(true);
  });

  it("subtracts the pending scroll", () => {
    expect(shouldHideElement(at(900), 400, 0.75)).toBe(false);
  });
});

describe("pendingHashScroll", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/");
    Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
  });

  function setup({ top, scrollY = 0, scrollHeight = 5000, margin = "" }: {
    top: number;
    scrollY?: number;
    scrollHeight?: number;
    margin?: string;
  }) {
    document.body.innerHTML = `<h2 id="bao-chi" style="scroll-margin-top: ${margin}"></h2>`;
    const target = document.getElementById("bao-chi") as HTMLElement;
    target.getBoundingClientRect = () => ({ top }) as DOMRect;
    Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
    Object.defineProperty(window, "scrollY", { value: scrollY, configurable: true });
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: scrollHeight,
      configurable: true,
    });
  }

  it("is 0 when there is no hash", () => {
    setup({ top: 1000 });
    expect(pendingHashScroll(document)).toBe(0);
  });

  it("is the distance to a target below the screen", () => {
    setup({ top: 1000 });
    window.history.replaceState(null, "", "/#bao-chi");
    expect(pendingHashScroll(document)).toBe(1000);
  });

  it("subtracts the scroll margin of the target", () => {
    setup({ top: 1000, margin: "80px" });
    window.history.replaceState(null, "", "/#bao-chi");
    expect(pendingHashScroll(document)).toBe(920);
  });

  it("is 0 for an unknown hash", () => {
    setup({ top: 1000 });
    window.history.replaceState(null, "", "/#does-not-exist");
    expect(pendingHashScroll(document)).toBe(0);
  });

  it("is limited by the maximum scroll", () => {
    setup({ top: 1000, scrollY: 3900, scrollHeight: 5000 });
    window.history.replaceState(null, "", "/#bao-chi");
    expect(pendingHashScroll(document)).toBe(300);
  });

  it("is never negative", () => {
    setup({ top: -200 });
    window.history.replaceState(null, "", "/#bao-chi");
    expect(pendingHashScroll(document)).toBe(0);
  });
});

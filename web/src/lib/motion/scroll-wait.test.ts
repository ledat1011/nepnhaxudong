import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { whenScrollingStops } from "./scroll-wait";

/** Removes `onscrollend` from the window for one test, like a browser without `scrollend`. */
function withoutScrollEnd(): () => void {
  let owner: object | null = window;
  while (owner && !Object.prototype.hasOwnProperty.call(owner, "onscrollend")) {
    owner = Object.getPrototypeOf(owner);
  }
  if (!owner) return () => {};
  const descriptor = Object.getOwnPropertyDescriptor(owner, "onscrollend")!;
  delete (owner as Record<string, unknown>).onscrollend;
  return () => Object.defineProperty(owner, "onscrollend", descriptor);
}

const scroll = () => window.dispatchEvent(new Event("scroll"));
const scrollEnd = () => window.dispatchEvent(new Event("scrollend"));

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("whenScrollingStops", () => {
  it("calls back after the quiet time when the page does not scroll", () => {
    const callback = vi.fn();
    whenScrollingStops(callback);
    vi.advanceTimersByTime(149);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("waits for scrollend once the page scrolls, even through a long gap between frames", () => {
    expect("onscrollend" in window).toBe(true);
    const callback = vi.fn();
    whenScrollingStops(callback);
    vi.advanceTimersByTime(50);
    scroll();
    // A busy page can send no scroll event for a while in the middle of a smooth scroll.
    vi.advanceTimersByTime(400);
    expect(callback).not.toHaveBeenCalled();
    scroll();
    vi.advanceTimersByTime(100);
    scrollEnd();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("without scrollend, calls back when no scroll event came for the quiet time", () => {
    const restore = withoutScrollEnd();
    try {
      const callback = vi.fn();
      whenScrollingStops(callback);
      for (let i = 0; i < 10; i++) {
        vi.advanceTimersByTime(100);
        scroll();
      }
      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(149);
      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(callback).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it("stops waiting after the longest wait", () => {
    const callback = vi.fn();
    whenScrollingStops(callback);
    for (let elapsed = 0; elapsed < 2400; elapsed += 100) {
      scroll();
      vi.advanceTimersByTime(100);
    }
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(100);
    expect(callback).toHaveBeenCalledTimes(1);
    scrollEnd();
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls nothing after the wait is cancelled", () => {
    const callback = vi.fn();
    const cancel = whenScrollingStops(callback);
    scroll();
    cancel();
    scrollEnd();
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });
});

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
const input = (type: string) => window.dispatchEvent(new Event(type));

const QUIET_MS = 150;
/** The fake clock runs frame callbacks every 16 ms. */
const FRAME_MS = 16;
/** Enough time for the two confirmation frames, wherever the wait ended inside a frame. */
const CONFIRM_MS = 3 * FRAME_MS;

/** Sets `window.scrollY` for one test, as if the page had moved. */
function setScrollY(value: number): () => void {
  const descriptor = Object.getOwnPropertyDescriptor(window, "scrollY")!;
  Object.defineProperty(window, "scrollY", { value, configurable: true });
  return () => Object.defineProperty(window, "scrollY", descriptor);
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("whenScrollingStops", () => {
  it("calls back two frames after the quiet time when the page does not scroll", () => {
    const callback = vi.fn();
    whenScrollingStops(callback);
    vi.advanceTimersByTime(QUIET_MS);
    expect(callback).not.toHaveBeenCalled();
    // The quiet time ends at 150 ms; the frames come at 160 ms and 176 ms.
    vi.advanceTimersByTime(10);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(FRAME_MS);
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
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(CONFIRM_MS);
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
      vi.advanceTimersByTime(QUIET_MS);
      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(CONFIRM_MS);
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

  it("goes back to waiting when a scroll starts between the quiet time and the first frame", () => {
    const callback = vi.fn();
    whenScrollingStops(callback);
    vi.advanceTimersByTime(QUIET_MS + 5);
    scroll();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
    scrollEnd();
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("goes back to waiting when a scroll starts between the two frames", () => {
    const callback = vi.fn();
    whenScrollingStops(callback);
    // The first frame after the quiet time comes at 160 ms, the second at 176 ms.
    vi.advanceTimersByTime(QUIET_MS + 10 + 5);
    scroll();
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
    scrollEnd();
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("goes back to waiting when the page moved in a frame without a scroll event", () => {
    const callback = vi.fn();
    whenScrollingStops(callback);
    vi.advanceTimersByTime(QUIET_MS + 5);
    const restore = setScrollY(300);
    try {
      vi.advanceTimersByTime(FRAME_MS);
      expect(callback).not.toHaveBeenCalled();
      // The page stands still at its new place: a new quiet time and two frames end the wait.
      vi.advanceTimersByTime(QUIET_MS - FRAME_MS);
      expect(callback).not.toHaveBeenCalled();
      vi.advanceTimersByTime(CONFIRM_MS);
      expect(callback).toHaveBeenCalledTimes(1);
    } finally {
      restore();
    }
  });

  it("starts the quiet time again on user input that can start a scroll", () => {
    for (const type of ["pointerdown", "click", "keydown", "wheel", "touchstart"]) {
      const callback = vi.fn();
      const cancel = whenScrollingStops(callback);
      vi.advanceTimersByTime(100);
      input(type);
      vi.advanceTimersByTime(QUIET_MS - 1);
      expect(callback, type).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1 + CONFIRM_MS);
      expect(callback, type).toHaveBeenCalledTimes(1);
      cancel();
    }
  });

  it("goes back to waiting on a click in the confirmation frames", () => {
    const callback = vi.fn();
    whenScrollingStops(callback);
    vi.advanceTimersByTime(QUIET_MS + 10 + 5);
    input("click");
    vi.advanceTimersByTime(FRAME_MS);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(QUIET_MS + CONFIRM_MS);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("keeps waiting for scrollend when there is input during a running scroll", () => {
    const callback = vi.fn();
    whenScrollingStops(callback);
    scroll();
    input("keydown");
    vi.advanceTimersByTime(1000);
    expect(callback).not.toHaveBeenCalled();
    scrollEnd();
    vi.advanceTimersByTime(CONFIRM_MS);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not wait past the longest wait, however often a scroll comes back", () => {
    const callback = vi.fn();
    whenScrollingStops(callback);
    // Every scroll ends, and a new one starts in the confirmation frames of the last one.
    for (let elapsed = 0; elapsed < 2490; elapsed += 30) {
      scroll();
      vi.advanceTimersByTime(10);
      scrollEnd();
      vi.advanceTimersByTime(10);
      input("click");
      vi.advanceTimersByTime(10);
    }
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2500 - 2490);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("removes every listener it added, when it ends and when it is cancelled", () => {
    const added = vi.spyOn(window, "addEventListener");
    const removed = vi.spyOn(window, "removeEventListener");
    try {
      whenScrollingStops(vi.fn());
      vi.advanceTimersByTime(QUIET_MS + CONFIRM_MS);
      const cancel = whenScrollingStops(vi.fn());
      cancel();
      const key = ([type, listener]: unknown[]) => [type, listener];
      expect(removed.mock.calls.map(key)).toEqual(added.mock.calls.map(key));
      expect(added).toHaveBeenCalledTimes(2 * 7);
    } finally {
      added.mockRestore();
      removed.mockRestore();
    }
  });

  it("cancels a pending confirmation frame", () => {
    const callback = vi.fn();
    const cancel = whenScrollingStops(callback);
    vi.advanceTimersByTime(QUIET_MS + 5);
    cancel();
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
});

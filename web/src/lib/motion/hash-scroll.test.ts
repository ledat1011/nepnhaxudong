import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { whenHashScrollDone } from "./hash-scroll";

function pendHashScroll(top: number) {
  document.body.innerHTML = '<h2 id="bao-chi"></h2>';
  const target = document.getElementById("bao-chi") as HTMLElement;
  target.getBoundingClientRect = () => ({ top }) as DOMRect;
  Object.defineProperty(document.documentElement, "scrollHeight", {
    value: 5000,
    configurable: true,
  });
  window.history.replaceState(null, "", "/#bao-chi");
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  window.history.replaceState(null, "", "/");
});

describe("whenHashScrollDone", () => {
  it("calls back at once when there is no hash", () => {
    const callback = vi.fn();
    whenHashScrollDone(document, callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls back at once when the scroll landed less than a pixel from the target", () => {
    pendHashScroll(0.4);
    const callback = vi.fn();
    whenHashScrollDone(document, callback);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls back after the quiet time when no scroll event comes at all", () => {
    pendHashScroll(500);
    const callback = vi.fn();
    whenHashScrollDone(document, callback);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(149);
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(callback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(5000);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("waits while scroll events keep coming", () => {
    pendHashScroll(500);
    const callback = vi.fn();
    whenHashScrollDone(document, callback);
    for (let i = 0; i < 10; i++) {
      vi.advanceTimersByTime(100);
      window.dispatchEvent(new Event("scroll"));
    }
    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("calls nothing after the wait is cancelled", () => {
    pendHashScroll(500);
    const callback = vi.fn();
    const cancel = whenHashScrollDone(document, callback);
    cancel();
    window.dispatchEvent(new Event("scrollend"));
    vi.advanceTimersByTime(5000);
    expect(callback).not.toHaveBeenCalled();
  });
});

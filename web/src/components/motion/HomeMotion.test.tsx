import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadGsap } from "@/lib/motion/load-gsap";
import { REDUCED_MOTION_QUERY } from "@/lib/motion/reduced-motion";
import { HomeMotion } from "./HomeMotion";

vi.mock("@/lib/motion/load-gsap", () => ({ loadGsap: vi.fn() }));

type Listener = (event: { matches: boolean }) => void;

const revert = vi.fn();
const refresh = vi.fn();
const modules = {
  gsap: {
    matchMedia: () => ({
      add: (_query: string, callback: () => (() => void) | void) => {
        const cleanup = callback();
        revert.mockImplementation(() => cleanup?.());
      },
      revert,
    }),
  },
  ScrollTrigger: { refresh },
};

let reducedMatches = false;
let listeners: Listener[] = [];

function installMatchMedia() {
  window.matchMedia = vi.fn((query: string) => ({
    matches: query === REDUCED_MOTION_QUERY ? reducedMatches : !reducedMatches,
    media: query,
    addEventListener: (_type: string, listener: Listener) => listeners.push(listener),
    removeEventListener: (_type: string, listener: Listener) => {
      listeners = listeners.filter((item) => item !== listener);
    },
  })) as unknown as typeof window.matchMedia;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(loadGsap).mockReset();
  vi.mocked(loadGsap).mockResolvedValue(modules as never);
  revert.mockReset();
  refresh.mockReset();
  listeners = [];
  reducedMatches = false;
  delete document.documentElement.dataset.motion;
  installMatchMedia();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("HomeMotion", () => {
  it("does not load GSAP when reduced motion is on", async () => {
    reducedMatches = true;
    render(<HomeMotion setups={[vi.fn()]} />);
    await vi.runAllTimersAsync();
    expect(loadGsap).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it("loads GSAP after the browser is idle and runs every setup", async () => {
    const first = vi.fn();
    const second = vi.fn();
    render(<HomeMotion setups={[first, second]} />);
    expect(loadGsap).not.toHaveBeenCalled();
    await vi.runAllTimersAsync();
    expect(loadGsap).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith(modules, document);
    expect(second).toHaveBeenCalledTimes(1);
    expect(second).toHaveBeenCalledWith(modules, document);
    expect(document.documentElement.dataset.motion).toBe("on");
  });

  it("refreshes ScrollTrigger once, after every setup", async () => {
    const first = vi.fn();
    const second = vi.fn();
    render(<HomeMotion setups={[first, second]} />);
    await vi.runAllTimersAsync();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(refresh.mock.invocationCallOrder[0]).toBeGreaterThan(
      second.mock.invocationCallOrder[0],
    );
  });

  it("starts when the user turns reduced motion off", async () => {
    reducedMatches = true;
    render(<HomeMotion setups={[vi.fn()]} />);
    await vi.runAllTimersAsync();
    expect(loadGsap).not.toHaveBeenCalled();
    listeners.forEach((listener) => listener({ matches: false }));
    await vi.runAllTimersAsync();
    expect(loadGsap).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.motion).toBe("on");
  });

  it("reverts on unmount", async () => {
    const { unmount } = render(<HomeMotion setups={[vi.fn()]} />);
    await vi.runAllTimersAsync();
    expect(document.documentElement.dataset.motion).toBe("on");
    unmount();
    expect(revert).toHaveBeenCalled();
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it("does not run setups when unmounted before GSAP finishes loading", async () => {
    const setup = vi.fn();
    const { unmount } = render(<HomeMotion setups={[setup]} />);
    vi.advanceTimersByTime(300);
    unmount();
    await vi.runAllTimersAsync();
    expect(setup).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it("renders nothing", () => {
    const { container } = render(<HomeMotion setups={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("HomeMotion with a pending hash scroll", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    window.history.replaceState(null, "", "/");
  });

  function pendHashScroll() {
    const target = document.createElement("h2");
    target.id = "bao-chi";
    target.getBoundingClientRect = () => ({ top: 500 }) as DOMRect;
    document.body.appendChild(target);
    Object.defineProperty(document.documentElement, "scrollHeight", {
      value: 5000,
      configurable: true,
    });
    window.history.replaceState(null, "", "/#bao-chi");
  }

  it("waits for the scroll to end before it runs the setups", async () => {
    pendHashScroll();
    const setup = vi.fn();
    render(<HomeMotion setups={[setup]} />);
    await vi.advanceTimersByTimeAsync(300);
    expect(loadGsap).toHaveBeenCalled();
    expect(setup).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("scrollend"));
    expect(setup).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("runs the setups once the scroll events stop", async () => {
    pendHashScroll();
    const setup = vi.fn();
    render(<HomeMotion setups={[setup]} />);
    await vi.advanceTimersByTimeAsync(300);
    window.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(100);
    window.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(100);
    expect(setup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it("stops waiting after the longest wait", async () => {
    pendHashScroll();
    const setup = vi.fn();
    render(<HomeMotion setups={[setup]} />);
    await vi.advanceTimersByTimeAsync(300);
    expect(setup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(3000);
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it("runs nothing when unmounted during the wait", async () => {
    pendHashScroll();
    const setup = vi.fn();
    const { unmount } = render(<HomeMotion setups={[setup]} />);
    await vi.advanceTimersByTimeAsync(300);
    unmount();
    window.dispatchEvent(new Event("scrollend"));
    await vi.advanceTimersByTimeAsync(5000);
    expect(setup).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.motion).toBeUndefined();
  });

  it("runs nothing when reduced motion is turned on during the wait", async () => {
    pendHashScroll();
    const setup = vi.fn();
    render(<HomeMotion setups={[setup]} />);
    await vi.advanceTimersByTimeAsync(300);
    reducedMatches = true;
    listeners.forEach((listener) => listener({ matches: true }));
    window.dispatchEvent(new Event("scrollend"));
    await vi.advanceTimersByTimeAsync(5000);
    expect(setup).not.toHaveBeenCalled();
  });
});

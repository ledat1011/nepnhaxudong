import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadGsap } from "@/lib/motion/load-gsap";
import { REDUCED_MOTION_QUERY } from "@/lib/motion/reduced-motion";
import { HomeMotion } from "./HomeMotion";

vi.mock("@/lib/motion/load-gsap", () => ({ loadGsap: vi.fn() }));

type Listener = (event: { matches: boolean }) => void;

const revert = vi.fn();
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
  ScrollTrigger: {},
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


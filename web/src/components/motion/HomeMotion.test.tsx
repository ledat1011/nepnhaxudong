import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadGsap } from "@/lib/motion/load-gsap";
import { REDUCED_MOTION_QUERY } from "@/lib/motion/reduced-motion";
import { setupJourney } from "@/lib/motion/journey";
import { setupRiceStory } from "@/lib/motion/story/rice-story";
import { HOME_SETUPS, HomeMotion } from "./HomeMotion";

vi.mock("@/lib/motion/load-gsap", () => ({ loadGsap: vi.fn() }));

type Listener = (event: { matches: boolean }) => void;

const revert = vi.fn();
const refresh = vi.fn();
const sort = vi.fn();
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
  ScrollTrigger: { refresh, sort },
};

let reducedMatches = false;
let listeners: Listener[] = [];

/** Enough time for the frames the scroll wait watches after a scroll ends. */
const CONFIRM_MS = 50;

/** Makes `document.readyState` report a page that is still loading, until the returned call. */
function pendLoad(): () => void {
  Object.defineProperty(document, "readyState", { value: "interactive", configurable: true });
  return () => {
    delete (document as unknown as Record<string, unknown>).readyState;
  };
}

/** Records the `load` listeners added to and removed from the window. */
function watchLoadListeners() {
  const added = vi.spyOn(window, "addEventListener");
  const removed = vi.spyOn(window, "removeEventListener");
  const loadListeners = (spy: typeof added) =>
    spy.mock.calls.filter(([type]) => type === "load").map(([, listener]) => listener);
  return {
    added: () => loadListeners(added),
    removed: () => loadListeners(removed),
    restore: () => {
      added.mockRestore();
      removed.mockRestore();
    },
  };
}

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
  sort.mockReset();
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

  it("sorts the triggers into page order before that refresh", async () => {
    const setup = vi.fn();
    render(<HomeMotion setups={[setup]} />);
    await vi.runAllTimersAsync();
    expect(sort).toHaveBeenCalledTimes(1);
    expect(sort.mock.invocationCallOrder[0]).toBeGreaterThan(setup.mock.invocationCallOrder[0]);
    expect(sort.mock.invocationCallOrder[0]).toBeLessThan(refresh.mock.invocationCallOrder[0]);
  });

  it("runs the story setup before the journey setup", () => {
    expect(HOME_SETUPS).toContain(setupRiceStory);
    expect(HOME_SETUPS.indexOf(setupRiceStory)).toBeLessThan(HOME_SETUPS.indexOf(setupJourney));
  });

  it("waits for a running scroll to end before it runs the setups", async () => {
    const setup = vi.fn();
    render(<HomeMotion setups={[setup]} />);
    await vi.advanceTimersByTimeAsync(250);
    expect(loadGsap).toHaveBeenCalled();
    window.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(setup).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("scrollend"));
    await vi.advanceTimersByTimeAsync(CONFIRM_MS);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(document.documentElement.dataset.motion).toBe("on");
  });

  it("goes back to waiting when a scroll starts in the frames after the wait ended", async () => {
    const setup = vi.fn();
    render(<HomeMotion setups={[setup]} />);
    await vi.advanceTimersByTimeAsync(250);
    expect(loadGsap).toHaveBeenCalled();
    // The quiet time ends at 350 ms; a smooth scroll shows its first scroll event a frame later.
    await vi.advanceTimersByTimeAsync(105);
    window.dispatchEvent(new Event("scroll"));
    await vi.advanceTimersByTimeAsync(1000);
    expect(setup).not.toHaveBeenCalled();
    expect(refresh).not.toHaveBeenCalled();
    window.dispatchEvent(new Event("scrollend"));
    await vi.advanceTimersByTimeAsync(CONFIRM_MS);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("leaves the page as it is when GSAP fails to load", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(loadGsap).mockRejectedValue(new Error("chunk failed"));
    const setup = vi.fn();
    render(<HomeMotion setups={[setup]} />);
    await vi.runAllTimersAsync();
    expect(setup).not.toHaveBeenCalled();
    expect(document.documentElement.dataset.motion).toBeUndefined();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("tries to load GSAP again when the motion is turned on again after a failure", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(loadGsap).mockRejectedValueOnce(new Error("chunk failed"));
    const setup = vi.fn();
    render(<HomeMotion setups={[setup]} />);
    await vi.runAllTimersAsync();
    expect(setup).not.toHaveBeenCalled();
    listeners.forEach((listener) => listener({ matches: true }));
    listeners.forEach((listener) => listener({ matches: false }));
    await vi.runAllTimersAsync();
    expect(loadGsap).toHaveBeenCalledTimes(2);
    expect(setup).toHaveBeenCalledTimes(1);
    warn.mockRestore();
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

  it("waits for the window load event when the page is still loading", async () => {
    const restoreLoad = pendLoad();
    try {
      const setup = vi.fn();
      render(<HomeMotion setups={[setup]} />);
      await vi.runAllTimersAsync();
      expect(loadGsap).not.toHaveBeenCalled();
      window.dispatchEvent(new Event("load"));
      expect(loadGsap).not.toHaveBeenCalled();
      await vi.runAllTimersAsync();
      expect(loadGsap).toHaveBeenCalledTimes(1);
      expect(setup).toHaveBeenCalledTimes(1);
      expect(document.documentElement.dataset.motion).toBe("on");
    } finally {
      restoreLoad();
    }
  });

  it("does not wait for the load event when the page has already loaded", async () => {
    expect(document.readyState).toBe("complete");
    const load = watchLoadListeners();
    try {
      render(<HomeMotion setups={[vi.fn()]} />);
      await vi.runAllTimersAsync();
      expect(load.added()).toEqual([]);
      expect(loadGsap).toHaveBeenCalledTimes(1);
    } finally {
      load.restore();
    }
  });

  it("stops waiting for the load event on unmount", async () => {
    const restoreLoad = pendLoad();
    const load = watchLoadListeners();
    try {
      const { unmount } = render(<HomeMotion setups={[vi.fn()]} />);
      expect(load.added()).toHaveLength(1);
      unmount();
      expect(load.removed()).toEqual(load.added());
      window.dispatchEvent(new Event("load"));
      await vi.runAllTimersAsync();
      expect(loadGsap).not.toHaveBeenCalled();
    } finally {
      load.restore();
      restoreLoad();
    }
  });

  it("stops waiting for the load event when reduced motion is turned on", async () => {
    const restoreLoad = pendLoad();
    const load = watchLoadListeners();
    try {
      render(<HomeMotion setups={[vi.fn()]} />);
      listeners.forEach((listener) => listener({ matches: true }));
      expect(load.removed()).toEqual(load.added());
      window.dispatchEvent(new Event("load"));
      await vi.runAllTimersAsync();
      expect(loadGsap).not.toHaveBeenCalled();
      // Turned off again before the load: the motion waits for the load once more.
      listeners.forEach((listener) => listener({ matches: false }));
      expect(load.added()).toHaveLength(2);
      restoreLoad();
      window.dispatchEvent(new Event("load"));
      await vi.runAllTimersAsync();
      expect(loadGsap).toHaveBeenCalledTimes(1);
    } finally {
      load.restore();
      restoreLoad();
    }
  });

  it("calls the cleanup of every setup once when the motion is reverted", async () => {
    const cleanup = vi.fn();
    const other = vi.fn();
    const { unmount } = render(<HomeMotion setups={[() => cleanup, other]} />);
    await vi.runAllTimersAsync();
    expect(cleanup).not.toHaveBeenCalled();
    unmount();
    expect(cleanup).toHaveBeenCalledTimes(1);
  });

  it("runs the other setups and turns the motion on when one setup throws", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const error = new Error("broken setup");
    const cleanup = vi.fn();
    const later = vi.fn(() => cleanup);
    try {
      const { unmount } = render(
        <HomeMotion
          setups={[
            () => {
              throw error;
            },
            later,
          ]}
        />,
      );
      await vi.runAllTimersAsync();
      expect(later).toHaveBeenCalledTimes(1);
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(document.documentElement.dataset.motion).toBe("on");
      expect(warn).toHaveBeenCalledWith(expect.any(String), error);
      unmount();
      expect(cleanup).toHaveBeenCalledTimes(1);
    } finally {
      warn.mockRestore();
    }
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
    await vi.advanceTimersByTimeAsync(CONFIRM_MS);
    expect(setup).toHaveBeenCalledTimes(1);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("runs the setups when a hash scroll that never moves has been quiet", async () => {
    pendHashScroll();
    const setup = vi.fn();
    render(<HomeMotion setups={[setup]} />);
    await vi.advanceTimersByTimeAsync(300);
    expect(setup).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(setup).toHaveBeenCalledTimes(1);
  });

  it("stops waiting after the longest wait", async () => {
    pendHashScroll();
    const setup = vi.fn();
    render(<HomeMotion setups={[setup]} />);
    await vi.advanceTimersByTimeAsync(300);
    // The scroll events never stop, so only the longest wait ends it.
    for (let elapsed = 0; elapsed < 3000; elapsed += 100) {
      window.dispatchEvent(new Event("scroll"));
      await vi.advanceTimersByTimeAsync(100);
    }
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

import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { markNavigationPending } from "./navigation-pending";
import { NavigationProgress } from "./NavigationProgress";

const BAR = "[data-navigation-progress]";

describe("NavigationProgress", () => {
  let release: (() => void) | null = null;

  afterEach(() => {
    release?.();
    release = null;
  });

  it("draws nothing while no navigation waits", () => {
    const { container } = render(<NavigationProgress />);
    expect(container.querySelector(BAR)).toBeNull();
  });

  it("draws the bar while a navigation waits, and removes it after", () => {
    const { container } = render(<NavigationProgress />);
    act(() => {
      release = markNavigationPending();
    });
    expect(container.querySelector(BAR)).not.toBeNull();
    act(() => {
      release?.();
      release = null;
    });
    expect(container.querySelector(BAR)).toBeNull();
  });

  it("is fixed to the top edge and hidden from screen readers", () => {
    const { container } = render(<NavigationProgress />);
    act(() => {
      release = markNavigationPending();
    });
    const bar = container.querySelector(BAR) as HTMLElement;
    expect(bar).toHaveClass("fixed", "top-0");
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar).not.toHaveAttribute("role");
  });

  it("slides only when motion is allowed, so reduced motion gets a still bar", () => {
    const { container } = render(<NavigationProgress />);
    act(() => {
      release = markNavigationPending();
    });
    const classes = Array.from(container.querySelectorAll(`${BAR}, ${BAR} *`)).flatMap((el) =>
      el.className.toString().split(/\s+/),
    );
    const animated = classes.filter((name) => /animate-|transition/.test(name));
    expect(animated.length).toBeGreaterThan(0);
    expect(animated.every((name) => name.startsWith("motion-safe:"))).toBe(true);
  });
});

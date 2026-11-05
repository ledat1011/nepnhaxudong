import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isNavigationPending,
  markNavigationPending,
  subscribeNavigationPending,
} from "./navigation-pending";

describe("navigation pending store", () => {
  const releases: Array<() => void> = [];
  const mark = () => {
    const release = markNavigationPending();
    releases.push(release);
    return release;
  };

  afterEach(() => {
    releases.splice(0).forEach((release) => release());
  });

  it("is idle at first", () => {
    expect(isNavigationPending()).toBe(false);
  });

  it("is pending while at least one link waits", () => {
    const first = mark();
    const second = mark();
    expect(isNavigationPending()).toBe(true);
    first();
    expect(isNavigationPending()).toBe(true);
    second();
    expect(isNavigationPending()).toBe(false);
  });

  it("counts a release only once", () => {
    const first = mark();
    mark();
    first();
    first();
    expect(isNavigationPending()).toBe(true);
  });

  it("tells subscribers when the state changes", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeNavigationPending(listener);
    const release = mark();
    release();
    expect(listener).toHaveBeenCalledTimes(2);
    unsubscribe();
    mark();
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

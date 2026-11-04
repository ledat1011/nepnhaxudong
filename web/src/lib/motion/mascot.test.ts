import { afterEach, describe, expect, it, vi } from "vitest";
import type { GsapModules } from "./load-gsap";
import {
  FULL_TILT_VELOCITY,
  HEAD_MAX_DEG,
  RICE_MAX_DEG,
  setupMascot,
  tiltFor,
} from "./mascot";

describe("tiltFor", () => {
  it("is 0 when the page does not move", () => {
    expect(tiltFor(0, 3, 1500)).toBe(0);
  });

  it("grows with the velocity", () => {
    expect(tiltFor(750, 3, 1500)).toBe(1.5);
    expect(tiltFor(-750, 6, 1500)).toBe(-3);
  });

  it("never goes past the maximum angle", () => {
    expect(tiltFor(99999, 3, 1500)).toBe(3);
    expect(tiltFor(-99999, 6, 1500)).toBe(-6);
  });

  it("is 0 when the velocity is not a finite number", () => {
    expect(tiltFor(NaN, 3, 1500)).toBe(0);
    expect(tiltFor(Infinity, 3, 1500)).toBe(0);
  });
});

type UpdateSelf = { getVelocity: () => number };

function fakeModules() {
  const quick = new Map<string, ReturnType<typeof vi.fn>>();
  let onUpdate: ((self: UpdateSelf) => void) | undefined;
  const tween = () => ({
    pause: vi.fn().mockReturnThis(),
    restart: vi.fn().mockReturnThis(),
    invalidate: vi.fn().mockReturnThis(),
  });
  const quickTween = tween();
  const angles = new Map<string, number>();
  const gsap = {
    getProperty: vi.fn((target: Element) => angles.get(target.id) ?? 0),
    set: vi.fn(),
    to: vi.fn(tween),
    delayedCall: vi.fn(tween),
    quickTo: vi.fn((target: Element) => {
      const fn = Object.assign(vi.fn(), { tween: quickTween });
      quick.set(target.id, fn);
      return fn;
    }),
  };
  const ScrollTrigger = {
    create: vi.fn((vars: { onUpdate: (self: UpdateSelf) => void }) => {
      onUpdate = vars.onUpdate;
    }),
  };
  return {
    modules: { gsap, ScrollTrigger } as unknown as GsapModules,
    gsap,
    ScrollTrigger,
    quick,
    angles,
    update: (velocity: number) => onUpdate?.({ getVelocity: () => velocity }),
  };
}

describe("setupMascot", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("does nothing when the page has no mascot", () => {
    const fake = fakeModules();
    expect(() => setupMascot(fake.modules, document)).not.toThrow();
    expect(fake.ScrollTrigger.create).not.toHaveBeenCalled();
  });

  it("tilts the head with the scroll and the rice bundle the other way", () => {
    document.body.innerHTML =
      '<svg data-mascot=""><g><g id="head"></g><g id="body"></g><g id="rice"></g></g></svg>';
    const fake = fakeModules();
    setupMascot(fake.modules, document);

    expect(fake.gsap.set).toHaveBeenCalledWith(document.getElementById("head"), {
      svgOrigin: "278 257",
      rotation: 0,
    });
    expect(fake.gsap.set).toHaveBeenCalledWith(document.getElementById("rice"), {
      svgOrigin: "302 356",
      rotation: 0,
    });
    expect(fake.ScrollTrigger.create).toHaveBeenCalledWith(
      expect.objectContaining({ trigger: document.querySelector("svg[data-mascot]") }),
    );

    fake.update(FULL_TILT_VELOCITY / 2);
    expect(fake.quick.get("head")).toHaveBeenLastCalledWith(HEAD_MAX_DEG / 2, 0);
    expect(fake.quick.get("rice")).toHaveBeenLastCalledWith(-RICE_MAX_DEG / 2, 0);
  });

  it("starts every follow from the angle the group has now", () => {
    document.body.innerHTML =
      '<svg data-mascot=""><g><g id="head"></g><g id="rice"></g></g></svg>';
    const fake = fakeModules();
    setupMascot(fake.modules, document);

    // After a settle the groups are near 0°, not at the last follow angle.
    fake.angles.set("head", 0.25);
    fake.angles.set("rice", -0.5);
    fake.update(FULL_TILT_VELOCITY);
    expect(fake.gsap.getProperty).toHaveBeenCalledWith(document.getElementById("head"), "rotation");
    expect(fake.quick.get("head")).toHaveBeenLastCalledWith(HEAD_MAX_DEG, 0.25);
    expect(fake.quick.get("rice")).toHaveBeenLastCalledWith(-RICE_MAX_DEG, -0.5);
  });
});

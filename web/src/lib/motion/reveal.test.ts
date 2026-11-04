import { describe, expect, it } from "vitest";
import { shouldHideOnSetup } from "./reveal";

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

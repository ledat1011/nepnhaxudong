import { describe, expect, it } from "vitest";
import { BRAND } from "./colors";
import { contrastRatio, TEXT_PAIRS } from "./contrast";

describe("contrastRatio", () => {
  it("is about 21 for black on white", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 1);
  });

  it("is 1 for identical colors", () => {
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBe(1);
  });

  it("does not depend on argument order", () => {
    expect(contrastRatio("#4A2C1A", "#FBF7EE")).toBeCloseTo(
      contrastRatio("#FBF7EE", "#4A2C1A"),
      10,
    );
  });
});

describe("TEXT_PAIRS", () => {
  it.each(TEXT_PAIRS)("$name passes WCAG AA (>= 4.5:1)", ({ fg, bg }) => {
    expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("never uses grain as text on a light background", () => {
    const bad = TEXT_PAIRS.filter(
      (pair) =>
        pair.fg === BRAND.grain && (pair.bg === BRAND.rice || pair.bg === BRAND.straw),
    );
    expect(bad).toEqual([]);
  });
});

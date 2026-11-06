import { describe, expect, it } from "vitest";
import { frameShape, OVERLAP, staggerLayout } from "./journey-stagger";

describe("frameShape", () => {
  it("follows the photo's orientation", () => {
    expect(frameShape(797, 1165)).toBe("portrait");
    expect(frameShape(1200, 900)).toBe("wide");
    expect(frameShape(1000, 1050)).toBe("square");
  });
});

describe("staggerLayout", () => {
  it("gives the 2021 milestone a portrait frame and a wide frame of the same height", () => {
    const { frames } = staggerLayout(["portrait", "wide"]);
    expect(frames.map((f) => f.shape)).toEqual(["portrait", "wide"]);
    expect(frames[0].height).toBe(frames[1].height);
    expect(frames[0].left).toBe(0);
    expect(frames[1].left + frames[1].width).toBeCloseTo(100, 1);
    // Overlap at the corner: the second frame starts left of the first one's right edge, and below its top.
    expect(frames[0].width - frames[1].left).toBeCloseTo(OVERLAP * 100, 0);
    expect(frames[1].top).toBeGreaterThan(0);
    expect(frames[1].top).toBeLessThan(frames[0].height);
    expect(frames[1].top + frames[1].height).toBeCloseTo(100, 1);
  });

  it("keeps every frame inside the stage for any mix of shapes", () => {
    const shapes = ["portrait", "square", "wide"] as const;
    for (const a of shapes) for (const b of shapes) for (const c of shapes) {
      const { frames } = staggerLayout([a, b, c]);
      for (const f of frames) {
        expect(f.left).toBeGreaterThanOrEqual(0);
        expect(f.left + f.width).toBeLessThanOrEqual(100.01);
        expect(f.top + f.height).toBeLessThanOrEqual(100.01);
      }
      // Each neighbouring pair overlaps horizontally by at least OVERLAP.
      expect(frames[0].width - frames[1].left).toBeGreaterThanOrEqual(OVERLAP * 100 - 0.05);
      expect(frames[2].width - frames[1].left).toBeGreaterThanOrEqual(OVERLAP * 100 - 0.05);
    }
  });

  it("puts a third frame back on the left, below the second", () => {
    const { frames } = staggerLayout(["square", "wide", "square"]);
    expect(frames[2].left).toBe(0);
    expect(frames[2].top).toBeGreaterThan(frames[1].top);
    expect(frames[2].top).toBeLessThan(frames[1].top + frames[1].height);
    expect(frames[2].top + frames[2].height).toBeCloseTo(100, 1);
  });
});

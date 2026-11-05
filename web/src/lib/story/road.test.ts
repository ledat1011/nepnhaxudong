import { describe, expect, it } from "vitest";
import { ROAD_BEND_LEFT, ROAD_BEND_RIGHT, roadBend, roadPath, roadPoint } from "./road";

describe("story road", () => {
  it("bends the road away from the scene: right for the 1st, 3rd ... scene, left for the others", () => {
    expect(roadBend(0)).toBe(ROAD_BEND_RIGHT);
    expect(roadBend(1)).toBe(ROAD_BEND_LEFT);
    expect(roadBend(6)).toBe(ROAD_BEND_RIGHT);
    expect(ROAD_BEND_RIGHT).toBeGreaterThan(50);
    expect(ROAD_BEND_LEFT).toBeLessThan(50);
  });

  it("draws one stretch from the middle of the top to the middle of the bottom", () => {
    expect(roadPath(75)).toBe("M50 0C50 25 75 25 75 50C75 75 50 75 50 100");
  });

  it.each([ROAD_BEND_LEFT, ROAD_BEND_RIGHT])("starts and ends in the middle, bend %d at half way", (bend) => {
    expect(roadPoint(bend, 0)).toEqual({ x: 50, y: 0 });
    expect(roadPoint(bend, 1)).toEqual({ x: 50, y: 100 });
    const half = roadPoint(bend, 0.5);
    expect(half.x).toBeCloseTo(bend, 1);
    expect(half.y).toBeCloseTo(50, 1);
  });

  it("follows the drawn curve at the asked height, so the grain stays on the road", () => {
    for (let k = 0; k <= 20; k++) {
      const point = roadPoint(ROAD_BEND_RIGHT, k / 20);
      expect(point.y).toBeCloseTo((k / 20) * 100, 1);
      expect(point.x).toBeGreaterThanOrEqual(50);
      expect(point.x).toBeLessThanOrEqual(ROAD_BEND_RIGHT);
    }
  });

  it("clamps heights outside the stretch", () => {
    expect(roadPoint(ROAD_BEND_LEFT, -1)).toEqual({ x: 50, y: 0 });
    expect(roadPoint(ROAD_BEND_LEFT, 2)).toEqual({ x: 50, y: 100 });
  });
});

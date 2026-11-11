import { describe, expect, it } from "vitest";
import { greenRicePixels } from "./green-rice";

type Rgb = [number, number, number];

/** A 1 x 675 column: the top 10 pixels one colour (the sky) and the rest another. */
function column(top: Rgb, rest: Rgb) {
  const data = new Uint8ClampedArray(675 * 4);
  for (let y = 0; y < 675; y++) data.set([...(y < 10 ? top : rest), 255], y * 4);
  return data;
}

const at = (data: Uint8ClampedArray, y: number) => [...data.slice(y * 4, y * 4 + 3)];

describe("greenRicePixels", () => {
  it("turns the gold rice green", () => {
    const data = column([255, 255, 255], [215, 165, 45]);
    greenRicePixels(data, 1, 675);
    const [r, g, b] = at(data, 600);
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
  });

  it("keeps dark ink, the beige hat, the brown blouse and the grey shirt", () => {
    const kept: Rgb[] = [
      [40, 25, 15],
      [230, 210, 160],
      [107, 67, 37],
      [120, 120, 125],
    ];
    for (const colour of kept) {
      const data = column(colour, colour);
      greenRicePixels(data, 1, 675);
      expect(at(data, 600), colour.join()).toEqual(colour);
    }
  });

  it("leaves gold in the sky (the sun) as it is", () => {
    const data = column([215, 165, 45], [255, 255, 255]);
    greenRicePixels(data, 1, 675);
    expect(at(data, 0)).toEqual([215, 165, 45]);
  });
});

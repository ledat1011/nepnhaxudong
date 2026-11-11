import { describe, expect, it } from "vitest";
import { greenRiceCanvas, greenRicePixels } from "./green-rice";

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

describe("greenRicePixels on a band of rows", () => {
  it("knows where the band sits in the picture: gold above the sky line stays gold", () => {
    // A 1 x 20 band whose first row is row 190 of a 675 px picture; the sky line is at row 200.
    const data = new Uint8ClampedArray(20 * 4);
    for (let y = 0; y < 20; y++) data.set([215, 165, 45, 255], y * 4);
    greenRicePixels(data, 1, 20, 190, 675);
    expect(at(data, 0)).toEqual([215, 165, 45]);
    const [r, g] = at(data, 19);
    expect(g).toBeGreaterThan(r);
  });
});

describe("greenRiceCanvas", () => {
  it("lets the page run between bands of rows, so it never blocks for long", async () => {
    const canvas = document.createElement("canvas");
    const bands: Array<[number, number]> = [];
    const ctx = {
      drawImage: () => {},
      getImageData: (_x: number, y: number, w: number, h: number) => {
        bands.push([y, h]);
        return { data: new Uint8ClampedArray(w * h * 4) };
      },
      putImageData: () => {},
    };
    const doc = { createElement: () => Object.assign(canvas, { getContext: () => ctx }) } as unknown as Document;
    const img = { naturalWidth: 1200, naturalHeight: 675, decode: () => Promise.resolve() } as unknown as HTMLImageElement;
    let yields = 0;
    const result = await greenRiceCanvas(img, doc, async () => {
      yields++;
    });
    expect(result).toBe(canvas);
    // Only the rows below the sky line, in bands of at most 60 rows, with a pause before each.
    expect(bands[0][0]).toBe(200);
    expect(bands.every(([, h]) => h <= 60)).toBe(true);
    expect(bands.reduce((sum, [, h]) => sum + h, 0)).toBe(675 - 200);
    expect(yields).toBeGreaterThanOrEqual(bands.length);
  });
});

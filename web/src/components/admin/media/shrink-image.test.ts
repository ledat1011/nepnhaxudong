import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MAX_LONG_SIDE,
  QUALITY,
  THUMB_QUALITY,
  browserShrinkDeps,
  fitInside,
  shrinkImage,
  type ShrinkDeps,
} from "./shrink-image";

function file(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

/** A decoder that returns a picture of the given size; the encoder gives `outBytes` bytes, and 50 bytes for a thumbnail. */
function deps(width: number, height: number, outBytes = 1000): ShrinkDeps & { close: ReturnType<typeof vi.fn> } {
  const close = vi.fn();
  return {
    close,
    decode: vi.fn(async () => ({ width, height, close })),
    encode: vi.fn(
      async (_picture, w: number, h: number, type: string) =>
        new Blob([new Uint8Array(Math.max(w, h) <= 160 ? 50 : outBytes)], { type }),
    ),
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("fitInside", () => {
  it("keeps the aspect ratio and puts the long side at the limit", () => {
    expect(fitInside(4032, 3024, 2560)).toEqual({ width: 2560, height: 1920 });
    expect(fitInside(3024, 4032, 2560)).toEqual({ width: 1920, height: 2560 });
  });

  it("does not make a picture bigger", () => {
    expect(fitInside(800, 600, 2560)).toEqual({ width: 800, height: 600 });
  });
});

describe("shrinkImage", () => {
  it("makes a big phone photo at most 2560 px on the long side, as JPEG at quality 0.85", async () => {
    const d = deps(4032, 3024);
    const result = await shrinkImage(file("IMG_1.jpg", "image/jpeg", 8_000_000), d);
    expect(result.shrunk).toBe(true);
    expect(result.file.type).toBe("image/jpeg");
    expect(result.file.name).toBe("IMG_1.jpg");
    expect(result.file.size).toBe(1000);
    expect(d.encode).toHaveBeenCalledWith(expect.anything(), 2560, 1920, "image/jpeg", QUALITY);
    expect(d.close).toHaveBeenCalled();
    expect(MAX_LONG_SIDE).toBe(2560);
  });

  it("makes a 160 px thumbnail from the same decoded picture, for the preview", async () => {
    const d = deps(4032, 3024);
    const result = await shrinkImage(file("IMG_1.jpg", "image/jpeg", 8_000_000), d);
    expect(d.decode).toHaveBeenCalledTimes(1);
    expect(d.encode).toHaveBeenCalledWith(expect.anything(), 160, 120, "image/jpeg", THUMB_QUALITY);
    expect(result.thumbnail?.size).toBe(50);
  });

  it("keeps a PNG as PNG, so a transparent logo stays transparent", async () => {
    const d = deps(3000, 1000);
    const result = await shrinkImage(file("logo.png", "image/png", 5_000_000), d);
    expect(result.file.type).toBe("image/png");
    expect(result.file.name).toBe("logo.png");
    expect(d.encode).toHaveBeenCalledWith(expect.anything(), 2560, 853, "image/png", QUALITY);
  });

  it("writes a WebP as JPEG with a .jpg name", async () => {
    const d = deps(5000, 5000);
    const result = await shrinkImage(file("hat.webp", "image/webp", 4_000_000), d);
    expect(result.file.type).toBe("image/jpeg");
    expect(result.file.name).toBe("hat.jpg");
  });

  it("sends a small JPEG as it is, still with a thumbnail", async () => {
    const d = deps(800, 600);
    const original = file("nho.jpg", "image/jpeg", 300_000);
    const result = await shrinkImage(original, d);
    expect(result.file).toBe(original);
    expect(result.shrunk).toBe(false);
    expect(result.thumbnail).not.toBeNull();
  });

  it("writes a heavy image again even when its size in pixels is fine", async () => {
    const d = deps(2000, 1500, 900_000);
    const result = await shrinkImage(file("nang.jpg", "image/jpeg", 6_000_000), d);
    expect(result.shrunk).toBe(true);
    expect(d.encode).toHaveBeenCalledWith(expect.anything(), 2000, 1500, "image/jpeg", QUALITY);
  });

  it("keeps the original when the new file would not be smaller", async () => {
    const d = deps(3000, 3000, 5_000_000);
    const original = file("a.jpg", "image/jpeg", 4_000_000);
    const result = await shrinkImage(original, d);
    expect(result.file).toBe(original);
    expect(result.shrunk).toBe(false);
  });

  it("sends the original, without a thumbnail, when the browser cannot read the picture (HEIC on most browsers)", async () => {
    const original = file("IMG_2.HEIC", "image/heic", 3_000_000);
    const d: ShrinkDeps = { decode: vi.fn(async () => Promise.reject(new Error("cannot decode"))), encode: vi.fn() };
    expect(await shrinkImage(original, d)).toEqual({ file: original, shrunk: false, thumbnail: null });
    expect(d.encode).not.toHaveBeenCalled();
  });

  it("turns a HEIC photo into JPEG when the browser can read it, even a small one", async () => {
    const d = deps(1200, 900, 200_000);
    const result = await shrinkImage(file("IMG_3.HEIC", "", 500_000), d);
    expect(result.shrunk).toBe(true);
    expect(result.file.type).toBe("image/jpeg");
    expect(result.file.name).toBe("IMG_3.jpg");
  });

  it("sends the original when the browser cannot write the picture", async () => {
    const original = file("b.jpg", "image/jpeg", 9_000_000);
    const close = vi.fn();
    const d: ShrinkDeps = { decode: vi.fn(async () => ({ width: 4000, height: 3000, close })), encode: vi.fn(async () => null) };
    expect(await shrinkImage(original, d)).toEqual({ file: original, shrunk: false, thumbnail: null });
    expect(close).toHaveBeenCalled();
  });
});

describe("browserShrinkDeps", () => {
  it("decodes with the EXIF orientation applied, as the API does", async () => {
    const bitmap = { width: 1, height: 1, close: vi.fn() };
    const createImageBitmap = vi.fn(async () => bitmap);
    vi.stubGlobal("createImageBitmap", createImageBitmap);
    const photo = file("a.jpg", "image/jpeg", 10);
    expect(await browserShrinkDeps.decode(photo)).toBe(bitmap);
    expect(createImageBitmap).toHaveBeenCalledWith(photo, { imageOrientation: "from-image" });
  });

  /** A canvas 2D context that records what is drawn. jsdom has no canvas of its own. */
  function fakeCanvas() {
    const calls: string[] = [];
    const context = {
      set fillStyle(value: string) {
        calls.push(`fillStyle ${value}`);
      },
      fillRect: (...args: number[]) => calls.push(`fillRect ${args.join(",")}`),
      drawImage: (_image: unknown, ...args: number[]) => calls.push(`drawImage ${args.join(",")}`),
      imageSmoothingQuality: "low",
    };
    const canvases: HTMLCanvasElement[] = [];
    const create = document.createElement.bind(document);
    vi.spyOn(document, "createElement").mockImplementation(((tag: string) => {
      const element = create(tag);
      if (tag === "canvas") {
        const canvas = element as HTMLCanvasElement;
        canvases.push(canvas);
        canvas.getContext = (() => context) as unknown as HTMLCanvasElement["getContext"];
        canvas.toBlob = (callback: BlobCallback, type?: string, quality?: number) => {
          calls.push(`toBlob ${type} ${quality} ${canvas.width}x${canvas.height}`);
          callback(new Blob(["x"], { type }));
        };
      }
      return element;
    }) as typeof document.createElement);
    return { calls, canvases };
  }

  it("puts a JPEG on white before drawing, so transparent parts do not turn black, then frees the canvas", async () => {
    const { calls, canvases } = fakeCanvas();
    const blob = await browserShrinkDeps.encode({ width: 4000, height: 3000 }, 2560, 1920, "image/jpeg", 0.85);
    expect(blob?.type).toBe("image/jpeg");
    expect(calls).toEqual([
      "fillStyle #ffffff",
      "fillRect 0,0,2560,1920",
      "drawImage 0,0,2560,1920",
      "toBlob image/jpeg 0.85 2560x1920",
    ]);
    // iOS Safari keeps the memory of a canvas until its size is 0.
    expect(canvases[0].width).toBe(0);
    expect(canvases[0].height).toBe(0);
  });

  it("draws a PNG without a background", async () => {
    const { calls } = fakeCanvas();
    await browserShrinkDeps.encode({ width: 3000, height: 1000 }, 2560, 853, "image/png", 0.85);
    expect(calls).toEqual(["drawImage 0,0,2560,853", "toBlob image/png 0.85 2560x853"]);
  });
});

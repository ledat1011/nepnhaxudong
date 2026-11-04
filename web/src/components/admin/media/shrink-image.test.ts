import { describe, expect, it, vi } from "vitest";
import { MAX_LONG_SIDE, QUALITY, fitInside, shrinkImage, type ShrinkDeps } from "./shrink-image";

function file(name: string, type: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type });
}

/** A decoder that returns a picture of the given size, and an encoder that returns `outBytes` bytes. */
function deps(width: number, height: number, outBytes = 1000): ShrinkDeps & { close: ReturnType<typeof vi.fn> } {
  const close = vi.fn();
  return {
    close,
    decode: vi.fn(async () => ({ width, height, close })),
    encode: vi.fn(async (_picture, _w, _h, type: string) => new Blob([new Uint8Array(outBytes)], { type })),
  };
}

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

  it("sends a small JPEG as it is", async () => {
    const d = deps(800, 600);
    const original = file("nho.jpg", "image/jpeg", 300_000);
    const result = await shrinkImage(original, d);
    expect(result).toEqual({ file: original, shrunk: false });
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
    expect(await shrinkImage(original, d)).toEqual({ file: original, shrunk: false });
  });

  it("sends the original when the browser cannot read the picture (HEIC on most browsers)", async () => {
    const original = file("IMG_2.HEIC", "image/heic", 3_000_000);
    const d: ShrinkDeps = { decode: vi.fn(async () => Promise.reject(new Error("cannot decode"))), encode: vi.fn() };
    expect(await shrinkImage(original, d)).toEqual({ file: original, shrunk: false });
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
    expect(await shrinkImage(original, d)).toEqual({ file: original, shrunk: false });
    expect(close).toHaveBeenCalled();
  });
});

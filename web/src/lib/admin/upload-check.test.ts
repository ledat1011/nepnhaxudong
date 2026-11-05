import { describe, expect, it } from "vitest";
import { IMAGE_ACCEPT, checkPickedFile, checkUploadFile, isHeic } from "./upload-check";

const MB = 1024 * 1024;

function file(name: string, type: string, size: number): File {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("IMAGE_ACCEPT", () => {
  it("is every image type, with no capture, so a phone offers both the camera and the gallery", () => {
    expect(IMAGE_ACCEPT).toBe("image/*");
  });
});

describe("checkPickedFile", () => {
  it("accepts any image, also HEIC with an empty type: the browser converts it or the API answers", () => {
    expect(checkPickedFile(file("a.jpg", "image/jpeg", 20 * MB))).toBeNull();
    expect(checkPickedFile(file("a.heic", "", 1000))).toBeNull();
    expect(checkPickedFile(file("a.jpg", "image/heif", 1000))).toBeNull();
    expect(checkPickedFile(file("a.gif", "image/gif", 1000))).toBeNull();
  });

  it("rejects a file that is not an image", () => {
    expect(checkPickedFile(file("ghi-chu.pdf", "application/pdf", 1000))).toBe("Tệp này không phải là ảnh.");
    expect(checkPickedFile(file("ghi-chu", "", 1000))).toBe("Tệp này không phải là ảnh.");
  });
});

describe("checkUploadFile", () => {
  it("rejects a file over 15 MB, even after shrinking", () => {
    expect(checkUploadFile(file("a.jpg", "image/jpeg", 15 * MB + 1))).toBe("Ảnh quá lớn. Tối đa 15 MB.");
  });

  it("accepts a file of exactly 15 MB", () => {
    expect(checkUploadFile(file("a.jpg", "image/jpeg", 15 * MB))).toBeNull();
  });
});

describe("isHeic", () => {
  it("finds HEIC and HEIF by type or by name", () => {
    expect(isHeic(file("a.HEIC", "", 1))).toBe(true);
    expect(isHeic(file("a.jpg", "image/heif", 1))).toBe(true);
    expect(isHeic(file("a.jpg", "image/jpeg", 1))).toBe(false);
  });
});

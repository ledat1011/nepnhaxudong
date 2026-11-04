import { describe, expect, it } from "vitest";
import { checkImageFile } from "./upload-check";

const MB = 1024 * 1024;

function file(name: string, type: string, size: number): File {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: size });
  return f;
}

describe("checkImageFile", () => {
  const heic = "Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG.";

  it("rejects HEIC by extension when the type is empty", () => {
    expect(checkImageFile(file("a.heic", "", 1000))).toBe(heic);
  });

  it("rejects HEIF by type", () => {
    expect(checkImageFile(file("a.jpg", "image/heif", 1000))).toBe(heic);
  });

  it("rejects a file over 15 MB", () => {
    expect(checkImageFile(file("a.jpg", "image/jpeg", 15 * MB + 1))).toBe("Ảnh quá lớn. Tối đa 15 MB.");
  });

  it("accepts a file of exactly 15 MB", () => {
    expect(checkImageFile(file("a.jpg", "image/jpeg", 15 * MB))).toBeNull();
  });

  it("rejects other types", () => {
    expect(checkImageFile(file("a.gif", "image/gif", 1000))).toBe("Chỉ nhận ảnh JPEG, PNG hoặc WebP.");
  });

  it("accepts a 2 MB JPEG, PNG and WebP", () => {
    expect(checkImageFile(file("a.jpg", "image/jpeg", 2 * MB))).toBeNull();
    expect(checkImageFile(file("a.png", "image/png", 2 * MB))).toBeNull();
    expect(checkImageFile(file("a.webp", "image/webp", 2 * MB))).toBeNull();
  });
});

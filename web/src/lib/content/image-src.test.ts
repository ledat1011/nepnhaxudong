import { describe, expect, it } from "vitest";
import { toImageSrc } from "./image-src";

describe("toImageSrc", () => {
  it("prefixes a root-relative path with the site URL", () => {
    expect(toImageSrc("/media/2026/01/a.webp", "https://x.vn")).toBe(
      "https://x.vn/media/2026/01/a.webp",
    );
  });

  it("keeps an absolute URL as it is", () => {
    expect(toImageSrc("https://cdn.example.com/a.webp")).toBe(
      "https://cdn.example.com/a.webp",
    );
  });

  it("does not double the slash when the site URL ends with one", () => {
    expect(toImageSrc("/media/a.webp", "https://x.vn/")).toBe("https://x.vn/media/a.webp");
  });

  it("keeps a file of web/public as a root-relative path", () => {
    expect(toImageSrc("/journey/2021.webp", "https://x.vn")).toBe("/journey/2021.webp");
  });

  it("fails clearly when a relative path has no site URL", () => {
    expect(() => toImageSrc("/media/a.webp", undefined)).toThrow(/SITE_URL/);
  });
});

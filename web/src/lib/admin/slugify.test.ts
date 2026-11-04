import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
  it("removes Vietnamese marks and joins words with dashes", () => {
    expect(slugify("Câu chuyện mùa gặt ở Duy Tân")).toBe("cau-chuyen-mua-gat-o-duy-tan");
  });

  it("turns đ into d", () => {
    expect(slugify("Đồng lúa đẹp")).toBe("dong-lua-dep");
  });

  it("keeps only a-z, 0-9 and single dashes, with no dash at either end", () => {
    expect(slugify("  --Gạo   nếp!!  2024--  ")).toBe("gao-nep-2024");
  });

  it("cuts a 200-character title to at most 80 characters without a trailing dash", () => {
    const title = "mua gat ".repeat(25).trim();
    expect(title.length).toBeGreaterThanOrEqual(190);
    const slug = slugify(title);
    expect(slug.length).toBeLessThanOrEqual(80);
    expect(slug.length).toBeGreaterThan(70);
    expect(slug.endsWith("-")).toBe(false);
    expect(slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("is empty when the text has no letter or digit", () => {
    expect(slugify("🌾🌾")).toBe("");
    expect(slugify("")).toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { firstGap, showChecks } from "./show-checks";
import type { ProductAdminDto } from "./types";

function product(over: Partial<ProductAdminDto> = {}): ProductAdminDto {
  return {
    id: 3,
    sortOrder: 0,
    showPrice: false,
    visible: false,
    name: { vi: "Gạo nếp", en: "Sticky rice" },
    description: { vi: "Hạt tròn", en: "Round grains" },
    features: { vi: ["Thơm"], en: ["Fragrant"] },
    cookingTips: { vi: null, en: null },
    packagings: [{ weightGrams: 1000, priceVnd: null, sortOrder: 0 }],
    mediaIds: [1],
    missingEn: false,
    ...over,
  };
}

describe("showChecks", () => {
  it("passes every line for a complete product", () => {
    expect(showChecks(product())).toEqual([
      { key: "images", ok: true, label: "Có ảnh", fix: "product.images" },
      { key: "en", ok: true, label: "Có bản tiếng Anh", fix: "product.name.en" },
      { key: "packagings", ok: true, label: "Có quy cách đóng gói", fix: "product.packagings" },
    ]);
    expect(firstGap(product())).toBeNull();
  });

  it("names each missing part", () => {
    const checks = showChecks(product({ mediaIds: [], packagings: [] }));
    expect(checks.map((check) => [check.key, check.ok, check.label])).toEqual([
      ["images", false, "Chưa có ảnh"],
      ["en", true, "Có bản tiếng Anh"],
      ["packagings", false, "Chưa có quy cách đóng gói"],
    ]);
  });

  it("says there is no English version when the English name is missing", () => {
    const check = showChecks(product({ name: { vi: "Gạo nếp", en: null }, missingEn: true }))[1];
    expect(check).toEqual({ key: "en", ok: false, label: "Chưa có bản tiếng Anh", fix: "product.name.en" });
  });

  it("lists the English parts that are missing and points at the first one", () => {
    const check = showChecks(
      product({
        description: { vi: "Hạt tròn", en: null },
        features: { vi: ["Thơm"], en: [] },
        cookingTips: { vi: "Ngâm", en: "  " },
        missingEn: true,
      }),
    )[1];
    expect(check).toEqual({
      key: "en",
      ok: false,
      label: "Bản tiếng Anh còn thiếu: mô tả, đặc điểm, mẹo nấu",
      fix: "product.description.en",
    });
  });

  it("does not ask for English where there is no Vietnamese text", () => {
    const check = showChecks(product({ description: { vi: null, en: null }, cookingTips: { vi: " ", en: null } }))[1];
    expect(check.ok).toBe(true);
  });

  it("gives the first gap in the order of the lines", () => {
    expect(firstGap(product({ packagings: [], name: { vi: "Gạo", en: null } }))?.key).toBe("en");
    expect(firstGap(product({ packagings: [], mediaIds: [] }))?.fix).toBe("product.images");
  });
});

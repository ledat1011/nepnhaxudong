import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatPrice,
  formatWeight,
  telHref,
  zaloHref,
} from "./format";

describe("formatWeight", () => {
  it("uses kg from 1000 g with at most one decimal", () => {
    expect(formatWeight(2000, "vi")).toBe("2 kg");
    expect(formatWeight(1500, "vi")).toBe("1,5 kg");
    expect(formatWeight(1500, "en")).toBe("1.5 kg");
  });

  it("uses g below 1000 g", () => {
    expect(formatWeight(500, "en")).toBe("500 g");
  });
});

describe("formatPrice", () => {
  it("formats VND in the language's locale", () => {
    const vi = formatPrice(180000, "vi");
    expect(vi).toContain("180.000");
    expect(vi).toContain("₫");
    expect(formatPrice(180000, "en")).toContain("180,000");
  });
});

describe("formatDate", () => {
  it("formats the date in the Vietnam time zone", () => {
    expect(formatDate("2026-01-15T03:00:00Z", "vi")).toContain("2026");
    // 20:00 UTC is already the next day in Vietnam (UTC+7).
    expect(formatDate("2026-01-15T20:00:00Z", "en")).toContain("16");
  });
});

describe("telHref", () => {
  it("keeps only digits and a plus sign", () => {
    expect(telHref("0000 000 000")).toBe("tel:0000000000");
    expect(telHref("+84 912 345 678")).toBe("tel:+84912345678");
  });
});

describe("zaloHref", () => {
  it("builds a zalo.me link from a number", () => {
    expect(zaloHref("0912 345 678")).toBe("https://zalo.me/0912345678");
  });

  it("keeps a full URL unchanged", () => {
    expect(zaloHref("https://zalo.me/abc")).toBe("https://zalo.me/abc");
  });
});

import { describe, expect, it } from "vitest";
import { isMissingEn, toRequestText } from "./localized";

describe("toRequestText", () => {
  it("trims both sides and turns a blank value into null", () => {
    expect(toRequestText({ vi: "  Gạo  ", en: "  " })).toEqual({ vi: "Gạo", en: null });
  });

  it("keeps null as null", () => {
    expect(toRequestText({ vi: null, en: "Rice" })).toEqual({ vi: null, en: "Rice" });
  });
});

describe("isMissingEn", () => {
  it("is true when vi has text and en is empty", () => {
    expect(isMissingEn({ vi: "a", en: null })).toBe(true);
    expect(isMissingEn({ vi: "a", en: "   " })).toBe(true);
  });

  it("is false when both are empty or en has text", () => {
    expect(isMissingEn({ vi: null, en: null })).toBe(false);
    expect(isMissingEn({ vi: "  ", en: "" })).toBe(false);
    expect(isMissingEn({ vi: "a", en: "b" })).toBe(false);
  });
});

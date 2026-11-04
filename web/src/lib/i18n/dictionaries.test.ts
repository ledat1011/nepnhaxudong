import { describe, expect, it } from "vitest";
import { getDictionary } from "./dictionaries";

function collect(value: unknown, prefix = ""): [string, unknown][] {
  if (typeof value === "object" && value !== null) {
    return Object.entries(value).flatMap(([key, child]) =>
      collect(child, prefix ? `${prefix}.${key}` : key),
    );
  }
  return [[prefix, value]];
}

const vi = collect(getDictionary("vi"));
const en = collect(getDictionary("en"));

describe("dictionaries", () => {
  it("have the same keys in vi and en", () => {
    expect(vi.map(([key]) => key).sort()).toEqual(
      en.map(([key]) => key).sort(),
    );
  });

  it("have only non-empty string values", () => {
    for (const [key, value] of [...vi, ...en]) {
      expect(typeof value, key).toBe("string");
      expect((value as string).trim(), key).not.toBe("");
    }
  });

  it("use real text, not [MẪU] placeholders", () => {
    for (const [key, value] of [...vi, ...en]) {
      expect(value as string, key).not.toMatch(/^\[MẪU\]/);
    }
  });
});

describe("site description", () => {
  const MAX_DESCRIPTION_LENGTH = 160;

  it("fits a search result snippet in both languages", () => {
    for (const lang of ["vi", "en"] as const) {
      expect(getDictionary(lang).site.description.length).toBeLessThanOrEqual(
        MAX_DESCRIPTION_LENGTH,
      );
    }
  });

  it("names the region the same way in both languages, with no province name", () => {
    expect(getDictionary("vi").site.description).toContain("xứ Đông");
    expect(getDictionary("en").site.description).toContain("xứ Đông");
    expect(getDictionary("en").site.description).not.toContain("Hải Dương");
  });
});

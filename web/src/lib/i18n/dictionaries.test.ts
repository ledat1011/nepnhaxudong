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

  it("names the region so each reader knows it: xứ Đông in Vietnamese, the province in English", () => {
    const vi = getDictionary("vi");
    const en = getDictionary("en");
    expect(vi.site.description).toContain("xứ Đông");
    expect(en.site.description).toContain("Hải Dương province, northern Vietnam");
    // A visitor from abroad does not know the name xứ Đông (decision 0011, item 7).
    expect(JSON.stringify(en)).not.toContain("xứ Đông");
  });

  it("says on the first screen what is sold and where it comes from", () => {
    expect(getDictionary("vi").hero.what).toBe("Gạo nếp cái hoa vàng\u00a0· Hải Dương");
    expect(getDictionary("en").hero.what).toBe("Yellow-flower sticky rice\u00a0· Hải Dương, Vietnam");
  });
});

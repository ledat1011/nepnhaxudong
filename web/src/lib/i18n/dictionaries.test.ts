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

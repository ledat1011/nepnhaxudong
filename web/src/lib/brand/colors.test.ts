import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { BRAND, ILLUSTRATION_ONLY_COLORS, ILLUSTRATION_PALETTE } from "./colors";

const tokens = JSON.parse(
  readFileSync(join(process.cwd(), "..", "brand", "tokens", "tokens.json"), "utf8"),
) as { color: Record<string, { value: string }> };

const NAMES: Record<string, string> = {
  "nau-dat": "earth",
  "nau-ao": "coat",
  "vang-lua": "grain",
  "vang-rom": "straw",
  "trang-gao": "rice",
  "hong-ma": "blush",
  "xanh-ma": "sprout",
  da: "skin",
  toc: "hair",
  "xanh-troi": "sky",
  "xanh-troi-nhat": "skyLight",
  "xanh-la-nhat": "leafLight",
};

describe("brand colors", () => {
  it("matches tokens.json", () => {
    const all: Record<string, string> = { ...BRAND, ...ILLUSTRATION_ONLY_COLORS };
    for (const [token, key] of Object.entries(NAMES)) {
      expect(all[key], token).toBe(tokens.color[token].value);
    }
    expect(Object.keys(all)).toHaveLength(Object.keys(tokens.color).length);
  });

  it("palette has every brand and illustration color", () => {
    expect(ILLUSTRATION_PALETTE.has("#cfe4ee")).toBe(true);
    expect(ILLUSTRATION_PALETTE.has("#a9c47f")).toBe(true);
    expect(ILLUSTRATION_PALETTE.size).toBe(12);
  });
});

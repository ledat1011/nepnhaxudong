import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/app/globals.css", "utf8");

describe("public page CSS for touch screens", () => {
  it("removes the double-tap zoom delay on controls", () => {
    expect(css).toMatch(/touch-action:\s*manipulation/);
  });

  it("sets the tap highlight on purpose, in a brand colour", () => {
    expect(css).toMatch(/-webkit-tap-highlight-color:\s*color-mix\([^)]*--color-straw/);
  });
});

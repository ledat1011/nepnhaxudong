import { describe, expect, it } from "vitest";
import { pickLang } from "./pick-lang";

describe("pickLang", () => {
  it.each([
    [null, "vi"],
    ["", "vi"],
    ["en-US,en;q=0.9", "en"],
    ["en-GB;q=0.8, vi;q=0.9", "vi"],
    ["fr-FR,fr;q=0.9", "vi"],
    ["fr, en;q=0.5", "en"],
    ["*", "vi"],
    ["en;q=0", "vi"],
    ["EN", "en"],
  ])("maps %j to %s", (header, expected) => {
    expect(pickLang(header)).toBe(expected);
  });

  it("falls back to vi on a malformed q value", () => {
    expect(pickLang("en;q=abc")).toBe("vi");
  });
});

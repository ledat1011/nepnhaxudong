import { describe, expect, it } from "vitest";
import robots from "./robots";

describe("robots", () => {
  it("disallows /admin and the API", () => {
    const { rules } = robots();
    const first = Array.isArray(rules) ? rules[0] : rules;
    const disallow = [first.disallow ?? []].flat();
    expect(disallow).toContain("/admin");
    expect(disallow).toContain("/api/");
  });
});

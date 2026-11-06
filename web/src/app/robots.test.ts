import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";

function firstRule() {
  const { rules } = robots();
  return Array.isArray(rules) ? rules[0] : rules;
}

describe("robots", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("disallows /admin and the API", () => {
    const disallow = [firstRule().disallow ?? []].flat();
    expect(disallow).toContain("/admin");
    expect(disallow).toContain("/api/");
  });

  it("lets link-preview bots read a preview copy (SITE_NOINDEX=1), without a sitemap", () => {
    vi.stubEnv("SITE_NOINDEX", "1");
    expect(firstRule()).toEqual({ userAgent: "*", allow: "/", disallow: ["/admin", "/api/"] });
    expect(robots().sitemap).toBeUndefined();
  });
});

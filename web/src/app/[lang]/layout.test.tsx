import { afterEach, describe, expect, it, vi } from "vitest";
import { BRAND } from "@/lib/brand/colors";
import { generateMetadata, viewport } from "./layout";

// next/font only works inside the Next build.
vi.mock("@/app/fonts", () => ({ fontClassName: "font-test" }));

describe("LangLayout metadata", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("lets search engines index the site by default", () => {
    expect(generateMetadata().robots).toBeUndefined();
  });

  it("asks search engines not to index a preview copy (SITE_NOINDEX=1)", () => {
    vi.stubEnv("SITE_NOINDEX", "1");
    expect(generateMetadata().robots).toEqual({ index: false, follow: false });
  });
});

describe("LangLayout viewport", () => {
  it("colours the phone browser bar like the page ground", () => {
    expect(viewport.themeColor).toBe(BRAND.rice);
  });
});

import { describe, expect, it } from "vitest";
import type { ProductAdminDto, StoryAdminDto } from "./types";
import { productPublicHref, storyPublicHref } from "./public-links";

const story = (overrides: Partial<StoryAdminDto> = {}): StoryAdminDto => ({
  id: 4,
  status: "PUBLISHED",
  publishedAt: "2026-11-01T00:00:00Z",
  coverMediaId: null,
  slug: { vi: "mua-gat", en: null },
  title: { vi: "Mùa gặt", en: null },
  excerpt: { vi: null, en: null },
  bodyHtml: { vi: null, en: null },
  missingEn: true,
  ...overrides,
});

describe("storyPublicHref", () => {
  it("is the Vietnamese page of a published story", () => {
    expect(storyPublicHref(story())).toBe("/vi/cau-chuyen/mua-gat");
  });

  it("is null for a draft, a story without a slug, and a story not saved yet", () => {
    expect(storyPublicHref(story({ status: "DRAFT" }))).toBeNull();
    expect(storyPublicHref(story({ slug: { vi: null, en: null } }))).toBeNull();
    expect(storyPublicHref(undefined)).toBeNull();
  });
});

describe("productPublicHref", () => {
  it("is the product section of the home page for a product shown on the web", () => {
    expect(productPublicHref({ id: 3, visible: true } as ProductAdminDto)).toBe("/vi#san-pham");
  });

  it("is null for a hidden product and for a product not saved yet", () => {
    expect(productPublicHref({ id: 3, visible: false } as ProductAdminDto)).toBeNull();
    expect(productPublicHref(undefined)).toBeNull();
  });
});

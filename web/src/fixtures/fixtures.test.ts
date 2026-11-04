import { describe, expect, it } from "vitest";
import homeVi from "./home.vi.json";
import homeEn from "./home.en.json";
import storiesVi from "./stories.vi.json";
import storiesEn from "./stories.en.json";

const FIXTURES = {
  "home.vi": homeVi,
  "home.en": homeEn,
  "stories.vi": storiesVi,
  "stories.en": storiesEn,
};

const TEXT_FIELDS = new Set([
  "name",
  "description",
  "features",
  "cookingTips",
  "title",
  "excerpt",
  "bodyHtml",
  "tagline",
  "sourceName",
  "address",
  "hours",
]);

type Visit = (s: string, key: string | null, inText: boolean) => void;

function walk(value: unknown, key: string | null, inText: boolean, visit: Visit): void {
  if (typeof value === "string") {
    visit(value, key, inText);
  } else if (Array.isArray(value)) {
    value.forEach((v) => walk(v, key, inText, visit));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      walk(v, k, TEXT_FIELDS.has(k), visit);
    }
  }
}

const stripTags = (html: string) => html.replace(/<[^>]*>/g, "").trim();

describe.each(Object.entries(FIXTURES))("fixture %s", (_name, data) => {
  it("uses only example.com URLs", () => {
    walk(data, null, false, (s, key) => {
      if (s.startsWith("http")) {
        expect(s, `field ${key}`).toMatch(/^https:\/\/example\.com\//);
      }
      if (key === "bodyHtml") {
        for (const m of s.matchAll(/href="([^"]*)"/g)) {
          expect(m[1]).toMatch(/^https:\/\/example\.com\//);
        }
      }
    });
  });

  it("starts every text field with [MẪU]", () => {
    let checked = 0;
    walk(data, null, false, (s, key, inText) => {
      if (!inText) return;
      checked += 1;
      const text = key === "bodyHtml" ? stripTags(s) : s;
      expect(text, `field ${key}`).toMatch(/^\[MẪU\]/);
    });
    expect(checked).toBeGreaterThan(0);
  });

  it("has no images", () => {
    walk(data, null, false, (s, key) => {
      if (key === "bodyHtml") expect(s).not.toMatch(/<img/i);
    });
    expect(JSON.stringify(data)).not.toMatch(
      /"url":"[^"]*\.(png|jpe?g|webp|gif|svg)/i,
    );
    for (const item of Array.isArray(data) ? data : [data]) {
      const o = item as Record<string, unknown>;
      if ("cover" in o) expect(o.cover).toBeNull();
    }
  });
});

describe("home fixtures", () => {
  it.each([
    ["vi", homeVi],
    ["en", homeEn],
  ])("has the agreed shape in %s", (_lang, home) => {
    expect(home.contact.phone).toBe("0000 000 000");
    expect(home.social.tiktok).toBeNull();
    expect(home.products).toHaveLength(1);
    const product = home.products[0];
    expect(product.features).toHaveLength(3);
    expect(product.showPrice).toBe(false);
    expect(product.packagings.map((p) => p.weightGrams)).toEqual([1000, 2000]);
    expect(product.packagings.every((p) => p.priceVnd === null)).toBe(true);
    expect(product.images).toEqual([]);
    expect(home.timeline).toHaveLength(3);
    expect(home.timeline.every((t) => t.image === null)).toBe(true);
    expect(home.press).toHaveLength(2);
    expect(home.press.every((p) => p.image === null)).toBe(true);
    for (const v of Object.values(home.contact)) expect(v).not.toBeNull();
  });
});

describe("stories fixtures", () => {
  it.each([
    ["vi", storiesVi],
    ["en", storiesEn],
  ])("has 4 stories with ISO dates in %s", (_lang, stories) => {
    expect(stories).toHaveLength(4);
    for (const s of stories) {
      expect(s.publishedAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    }
  });

  it("has an English story that falls back to a Vietnamese slug and one with its own slug", () => {
    const viSlugs = new Set(storiesVi.map((s) => s.slug));
    expect(storiesEn.some((s) => viSlugs.has(s.slug))).toBe(true);
    expect(storiesEn.some((s) => !viSlugs.has(s.slug))).toBe(true);
  });

  it("has a story with a long unbroken URL-like word in a paragraph", () => {
    const long = storiesVi.some((s) => /<p>[^<]*[^\s<]{60,}/.test(s.bodyHtml));
    expect(long).toBe(true);
  });
});

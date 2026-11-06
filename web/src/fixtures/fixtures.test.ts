import { existsSync } from "node:fs";
import { join } from "node:path";
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

// The product's name, description and features are real (2026-11-06: from the real bag and the
// owner's story), so they are not in this list; its cooking tips are still sample text.
const TEXT_FIELDS = new Set([
  "cookingTips",
  "title",
  "excerpt",
  "bodyHtml",
  "sourceName",
  "hours",
]);

// The owner gave the real tagline, address and phone number (2026-11-05), so these are not
// sample text any more and are left out of the [MẪU] check. The same holds for the journey
// (timeline): the owner gave its real story and photos (2026-11-06).
const REAL_CONTENT_KEYS = new Set(["timeline"]);
type Visit = (s: string, key: string | null, inText: boolean) => void;

function walk(value: unknown, key: string | null, inText: boolean, visit: Visit): void {
  if (typeof value === "string") {
    visit(value, key, inText);
  } else if (Array.isArray(value)) {
    value.forEach((v) => walk(v, key, inText, visit));
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      if (REAL_CONTENT_KEYS.has(k)) continue;
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

  it("has no images outside the journey", () => {
    walk(data, null, false, (s, key) => {
      if (key === "bodyHtml") expect(s).not.toMatch(/<img/i);
    });
    const withoutJourney = Array.isArray(data) ? data : { ...data, timeline: [] };
    expect(JSON.stringify(withoutJourney)).not.toMatch(
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
  ])("has the agreed shape in %s", (lang, home) => {
    expect(home.contact.phone).toBe("0967 598 629");
    expect(home.contact.zalo).toBe("0967 598 629");
    // The family does not use Messenger, so the site shows no Messenger link.
    expect(home.contact.messenger).toBeNull();
    expect(home.social.tiktok).toBeNull();
    expect(home.products).toHaveLength(1);
    const product = home.products[0];
    expect(product.features).toHaveLength(3);
    // The spec's three features (3.2), in the order the icons expect: round, soft, fragrant.
    const keywords = lang === "vi" ? ["tròn mẩy", "dẻo", "thơm"] : ["plump", "soft", "fragrant"];
    product.features.forEach((feature, i) => expect(feature.toLowerCase()).toContain(keywords[i]));
    expect(product.showPrice).toBe(false);
    expect(product.packagings.map((p) => p.weightGrams)).toEqual([1000, 2000]);
    expect(product.packagings.every((p) => p.priceVnd === null)).toBe(true);
    expect(product.images).toEqual([]);
    expect(home.timeline.map((t) => t.year)).toEqual([2008, 2021, 2022, 2023, 2025]);
    expect(home.timeline[0].image).toBeNull();
    for (const { image } of home.timeline.slice(1)) {
      expect(image?.url).toMatch(/^\/journey\/[a-z0-9-]+\.webp$/);
      expect(existsSync(join(process.cwd(), "public", image!.url)), image?.url).toBe(true);
      expect([image?.width, image?.height]).toEqual([1200, 900]);
    }
    expect(home.press).toHaveLength(2);
    expect(home.press.every((p) => p.image === null)).toBe(true);
    const { messenger: _messenger, ...rest } = home.contact;
    for (const v of Object.values(rest)) expect(v).not.toBeNull();
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

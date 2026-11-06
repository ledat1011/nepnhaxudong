import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import homeVi from "./home.vi.json";
import homeEn from "./home.en.json";
import storiesVi from "./stories.vi.json";
import storiesEn from "./stories.en.json";

// The stories are real content (owner, 2026-11-06), so only the home fixtures are checked for
// sample text here; the stories have their own checks below.
const FIXTURES = {
  "home.vi": homeVi,
  "home.en": homeEn,
};

// The product's name, description and features are real (2026-11-06: from the real bag and the
// owner's story), so they are not in this list; its cooking tips are still sample text.
const TEXT_FIELDS = new Set(["cookingTips", "hours"]);

// The owner gave the real tagline, address and phone number (2026-11-05), so these are not
// sample text any more and are left out of the [MẪU] check. The same holds for the journey
// (timeline): the owner gave its real story and photos (2026-11-06), and for the press: the
// owner gave the real report of the Nhị Chiểu ward (2026-11-06), with its real link.
const REAL_CONTENT_KEYS = new Set(["timeline", "press"]);
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

/** Width and height of a WebP file, read from its header. */
function webpSize(file: string): [number, number] {
  const data = readFileSync(file);
  const format = data.toString("ascii", 12, 16);
  if (format === "VP8 ") return [data.readUInt16LE(26) & 0x3fff, data.readUInt16LE(28) & 0x3fff];
  if (format === "VP8L") {
    const bits = data.readUInt32LE(21);
    return [(bits & 0x3fff) + 1, ((bits >> 14) & 0x3fff) + 1];
  }
  if (format === "VP8X") return [data.readUIntLE(24, 3) + 1, data.readUIntLE(27, 3) + 1];
  throw new Error(`${file} is not a WebP file`);
}

describe.each(Object.entries(FIXTURES))("fixture %s", (_name, data) => {
  it("uses only example.com URLs", () => {
    walk(data, null, false, (s, key) => {
      if (s.startsWith("http")) {
        expect(s, `field ${key}`).toMatch(/^https:\/\/example\.com\//);
      }
    });
  });

  it("starts every text field with [MẪU]", () => {
    let checked = 0;
    walk(data, null, false, (s, key, inText) => {
      if (!inText) return;
      checked += 1;
      expect(s, `field ${key}`).toMatch(/^\[MẪU\]/);
    });
    expect(checked).toBeGreaterThan(0);
  });

  it("has no images outside the journey and the press", () => {
    expect(JSON.stringify({ ...data, timeline: [], press: [] })).not.toMatch(
      /"url":"[^"]*\.(png|jpe?g|webp|gif|svg)/i,
    );
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
    expect(home.timeline.map((t) => t.year)).toEqual([2008, 2021, 2022, 2023, 2024, 2025]);
    expect(home.timeline.map((t) => t.images.length)).toEqual([0, 2, 1, 1, 2, 1]);
    // 2021: the food safety certificate first, then the first bag.
    expect(home.timeline[1].images.map((image) => image.url)).toEqual([
      "/journey/2021-giay-chung-nhan-attp.webp",
      "/journey/2021-bao-2kg-dau-tien.webp",
    ]);
    const images: { url: string; width: number; height: number; alt: string }[] =
      home.timeline.flatMap((t) => t.images);
    for (const image of images) {
      expect(image.url).toMatch(/^\/journey\/[a-z0-9-]+\.webp$/);
      const file = join(process.cwd(), "public", image.url);
      expect(existsSync(file), image.url).toBe(true);
      expect([image.width, image.height], image.url).toEqual(webpSize(file));
      expect(image.alt, image.url).not.toBe("");
    }
    // The one real report so far; the sample reports were removed (owner, 2026-11-06).
    expect(home.press).toHaveLength(1);
    const [report] = home.press;
    expect(report.url).toBe("https://www.facebook.com/reel/2585570238579411");
    expect(report.title).not.toMatch(/\[MẪU\]/);
    expect(report.image?.url).toBe("/press/2025-nhi-chieu-nep-cai-hoa-vang.webp");
    const pressFile = join(process.cwd(), "public", report.image!.url);
    expect([report.image?.width, report.image?.height]).toEqual(webpSize(pressFile));
    const { messenger: _messenger, ...rest } = home.contact;
    for (const v of Object.values(rest)) expect(v).not.toBeNull();
  });
});

describe("stories fixtures", () => {
  it.each([
    ["vi", storiesVi],
    ["en", storiesEn],
  ])("has the 5 real stories, newest first, with ISO dates in %s", (_lang, stories) => {
    expect(stories).toHaveLength(5);
    const dates = stories.map((s) => s.publishedAt);
    for (const date of dates) expect(date).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/);
    expect(dates).toEqual([...dates].sort().reverse());
  });

  it.each([
    ["vi", storiesVi],
    ["en", storiesEn],
  ])("has no sample text, no example.com link, no em dash and no body image in %s", (_lang, stories) => {
    const text = JSON.stringify(stories);
    expect(text).not.toMatch(/\[MẪU\]/);
    expect(text).not.toMatch(/example\.com/);
    // The site text uses no em dash (owner's style rule).
    expect(text).not.toContain("—");
    for (const s of stories) expect(s.bodyHtml).not.toMatch(/<img/i);
  });

  it.each([
    ["vi", storiesVi],
    ["en", storiesEn],
  ])("gives each cover a real file, its real size and an alt text in %s", (_lang, stories) => {
    for (const { cover } of stories) {
      if (cover === null) continue;
      expect(cover.url).toMatch(/^\/(journey|press)\/[a-z0-9-]+\.webp$/);
      const file = join(process.cwd(), "public", cover.url);
      expect(existsSync(file), cover.url).toBe(true);
      expect([cover.width, cover.height], cover.url).toEqual(webpSize(file));
      expect(cover.alt, cover.url).not.toBe("");
    }
  });

  it("has an English story that falls back to a Vietnamese slug and one with its own slug", () => {
    const viSlugs = new Set(storiesVi.map((s) => s.slug));
    expect(storiesEn.some((s) => viSlugs.has(s.slug))).toBe(true);
    expect(storiesEn.some((s) => !viSlugs.has(s.slug))).toBe(true);
  });

  it("links each translated story to its translation in both directions", () => {
    for (const en of storiesEn) {
      if (en.alternateSlug === null) continue;
      const vi = storiesVi.find((s) => s.slug === en.alternateSlug);
      expect(vi?.alternateSlug, en.slug).toBe(en.slug);
    }
  });
});

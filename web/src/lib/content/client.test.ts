import { describe, expect, it } from "vitest";
import { getContentClient } from "./client";
import storiesVi from "@/fixtures/stories.vi.json";
import storiesEn from "@/fixtures/stories.en.json";

describe("getContentClient", () => {
  it("returns the mock client for CONTENT_SOURCE=mock", async () => {
    const client = getContentClient({ CONTENT_SOURCE: "mock" });
    expect((await client.getHome("vi")).products).toHaveLength(1);
  });

  it("requires API_BASE_URL for CONTENT_SOURCE=api", () => {
    expect(() => getContentClient({ CONTENT_SOURCE: "api" })).toThrow(
      /API_BASE_URL/,
    );
  });

  it("returns an api client when API_BASE_URL is set", () => {
    const client = getContentClient({
      CONTENT_SOURCE: "api",
      API_BASE_URL: "https://api.test",
    });
    expect(typeof client.getHome).toBe("function");
  });

  it("never falls back to mock data when the source is unset or unknown", () => {
    expect(() => getContentClient({})).toThrow(/CONTENT_SOURCE/);
    expect(() => getContentClient({ CONTENT_SOURCE: "other" })).toThrow(
      /CONTENT_SOURCE/,
    );
  });
});

describe("mock client", () => {
  const client = getContentClient({ CONTENT_SOURCE: "mock" });

  it("fills home.stories with the 3 newest stories of that language", async () => {
    for (const [lang, source] of [
      ["vi", storiesVi],
      ["en", storiesEn],
    ] as const) {
      const home = await client.getHome(lang);
      const expected = [...source]
        .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt))
        .slice(0, 3)
        .map((s) => s.slug);
      expect(home.stories.map((s) => s.slug)).toEqual(expected);
      expect(home.stories[0]).not.toHaveProperty("bodyHtml");
      expect(home.lang).toBe(lang);
    }
  });

  it("finds a story without its own EN slug under its VI slug on en", async () => {
    const story = await client.getStory("en", "nep-cai-hoa-vang-len-truyen-hinh");
    expect(story?.slug).toBe("nep-cai-hoa-vang-len-truyen-hinh");
    expect(story?.alternateSlug).toBeNull();
  });

  it("does not find a story with its own EN slug by its VI slug on en", async () => {
    expect(await client.getStory("en", "tu-cua-hang-vat-tu-toi-bich-gao")).toBeNull();
    expect(
      (await client.getStory("en", "from-farm-shop-to-rice-bag"))?.alternateSlug,
    ).toBe("tu-cua-hang-vat-tu-toi-bich-gao");
  });

  it("returns null for an unknown slug", async () => {
    expect(await client.getStory("vi", "khong-co")).toBeNull();
  });

  it("pages the story list with a 0-based page", async () => {
    const first = await client.getStories("vi", 0);
    expect(first).toHaveLength(5);
    expect(first[0]).not.toHaveProperty("bodyHtml");
    expect(await client.getStories("vi", 1)).toEqual([]);
  });

  it("returns an empty list for a negative, fractional or NaN page", async () => {
    for (const page of [-1, 0.5, Number.NaN]) {
      expect(await client.getStories("vi", page)).toEqual([]);
    }
  });
});

import { describe, expect, it } from "vitest";
import { parsePage, storyAlternates } from "./story-routing";
import type { StoryDetail } from "./types";

function story(slug: string, alternateSlug: string | null): StoryDetail {
  return {
    slug,
    title: "t",
    excerpt: "e",
    publishedAt: "2026-04-10T02:00:00Z",
    cover: null,
    bodyHtml: "<p>x</p>",
    alternateSlug,
  };
}

describe("parsePage", () => {
  it("treats a missing page as the first page (0)", () => {
    expect(parsePage(undefined)).toBe(0);
  });

  it("accepts a non-negative integer", () => {
    expect(parsePage("0")).toBe(0);
    expect(parsePage("2")).toBe(2);
  });

  it.each(["-1", "abc", "1.5", "", " 1", "1e2", "01x"])("rejects %j", (value) => {
    expect(parsePage(value)).toBeNull();
  });

  it("rejects an array (repeated ?page=)", () => {
    expect(parsePage(["1", "2"])).toBeNull();
  });

  it("rejects a number too large to be a safe integer", () => {
    expect(parsePage("99999999999999999999")).toBeNull();
  });
});

describe("storyAlternates", () => {
  it("uses the own slug for the current language and the alternate slug for the other", () => {
    const result = storyAlternates("vi", story("mua-gat", "harvest"));
    expect(result).toEqual({ vi: "/vi/cau-chuyen/mua-gat", en: "/en/stories/harvest" });
  });

  it("works from the English side", () => {
    const result = storyAlternates("en", story("harvest", "mua-gat"));
    expect(result).toEqual({ vi: "/vi/cau-chuyen/mua-gat", en: "/en/stories/harvest" });
  });

  it("falls back to the same slug when there is no alternate slug", () => {
    const result = storyAlternates("vi", story("mua-gat", null));
    expect(result).toEqual({ vi: "/vi/cau-chuyen/mua-gat", en: "/en/stories/mua-gat" });
  });

  it("falls back to the same slug from the English side too", () => {
    const result = storyAlternates("en", story("chuyen-nha-nep-xu-dong", null));
    expect(result).toEqual({
      vi: "/vi/cau-chuyen/chuyen-nha-nep-xu-dong",
      en: "/en/stories/chuyen-nha-nep-xu-dong",
    });
  });
});

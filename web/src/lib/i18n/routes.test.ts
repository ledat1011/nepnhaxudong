import { describe, expect, it } from "vitest";
import {
  homePath,
  isStorySection,
  SECTION_IDS,
  STORY_SECTION,
  storiesPath,
  storyPath,
} from "./routes";

describe("routes", () => {
  it("builds the home path", () => {
    expect(homePath("vi")).toBe("/vi");
    expect(homePath("en")).toBe("/en");
  });

  it("builds a story path", () => {
    expect(storyPath("vi", "mua-gat")).toBe("/vi/cau-chuyen/mua-gat");
    expect(storyPath("en", "harvest")).toBe("/en/stories/harvest");
  });

  it("builds the story list path with an optional page", () => {
    expect(storiesPath("vi")).toBe("/vi/cau-chuyen");
    expect(storiesPath("vi", 0)).toBe("/vi/cau-chuyen");
    expect(storiesPath("en", 2)).toBe("/en/stories?page=2");
  });

  it("knows the story section name of each language", () => {
    expect(STORY_SECTION).toEqual({ vi: "cau-chuyen", en: "stories" });
    expect(isStorySection("vi", "cau-chuyen")).toBe(true);
    expect(isStorySection("vi", "stories")).toBe(false);
    expect(isStorySection("en", "stories")).toBe(true);
    expect(isStorySection("en", "cau-chuyen")).toBe(false);
  });

  it("lists the home section ids", () => {
    expect(SECTION_IDS).toEqual([
      "san-pham",
      "hanh-trinh",
      "bao-chi",
      "cau-chuyen",
      "lien-he",
    ]);
  });
});

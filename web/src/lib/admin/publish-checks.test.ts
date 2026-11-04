import { describe, expect, it } from "vitest";
import type { StoryAdminDto } from "./types";
import { publishChecks } from "./publish-checks";

function story(overrides: Partial<StoryAdminDto> = {}): StoryAdminDto {
  return {
    id: 5,
    status: "DRAFT",
    publishedAt: null,
    coverMediaId: 3,
    slug: { vi: "mua-gat", en: "harvest" },
    title: { vi: "Mùa gặt", en: "Harvest" },
    excerpt: { vi: "Tóm tắt", en: "Summary" },
    bodyHtml: { vi: "<p>Thân bài</p>", en: "<p>Body</p>" },
    missingEn: false,
    ...overrides,
  };
}

const labels = (s: StoryAdminDto) => publishChecks(s).map((check) => `${check.ok ? "ok" : "no"} ${check.label}`);

describe("publishChecks", () => {
  it("lists every check as done for a complete story", () => {
    expect(labels(story())).toEqual([
      "ok Có tiêu đề",
      "ok Có ảnh bìa",
      "ok Có tóm tắt",
      "ok Có nội dung",
      "ok Có bản tiếng Anh",
    ]);
  });

  it("names the gaps: no cover, no excerpt, an empty body and no English version", () => {
    const gaps = story({
      coverMediaId: null,
      excerpt: { vi: "  ", en: null },
      bodyHtml: { vi: "<p></p>", en: null },
      title: { vi: "Mùa gặt", en: null },
      slug: { vi: "mua-gat", en: null },
      missingEn: true,
    });
    expect(labels(gaps)).toEqual([
      "ok Có tiêu đề",
      "no Chưa có ảnh bìa",
      "no Chưa có tóm tắt",
      "no Chưa có nội dung",
      "no Chưa có bản tiếng Anh",
    ]);
  });

  it("counts a body with only an image as content", () => {
    const check = publishChecks(story({ bodyHtml: { vi: '<p><img src="/media/1.webp" alt="Lúa"></p>', en: null } }));
    expect(check.find((item) => item.key === "body")?.ok).toBe(true);
  });

  it("says which English parts are missing when the English title exists", () => {
    const partial = story({ excerpt: { vi: "Tóm tắt", en: null }, bodyHtml: { vi: "<p>Thân bài</p>", en: null }, missingEn: true });
    expect(labels(partial).at(-1)).toBe("no Bản tiếng Anh còn thiếu: tóm tắt, nội dung");
  });
});

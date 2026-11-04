import type { StoryAdminDto } from "./types";

export type PublishCheckKey = "title" | "cover" | "excerpt" | "body" | "en";

/** One line of the check panel that opens before a story is published. */
export type PublishCheck = { key: PublishCheckKey; ok: boolean; label: string };

function hasText(text: string | null): boolean {
  return (text ?? "").trim() !== "";
}

/** True when the html shows something: text, or a library image. Tiptap writes `<p></p>` for an empty body. */
function hasBody(html: string | null): boolean {
  const value = html ?? "";
  if (/<img\b/i.test(value)) return true;
  return value.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim() !== "";
}

/**
 * What a reader will see, checked on the saved story (publishing is locked while there are unsaved
 * changes). A gap does not block publishing: the writer may still choose "Vẫn đăng bài".
 */
export function publishChecks(story: StoryAdminDto): PublishCheck[] {
  const missingEnParts: string[] = [];
  if (hasText(story.excerpt.vi) && !hasText(story.excerpt.en)) missingEnParts.push("tóm tắt");
  if (hasBody(story.bodyHtml.vi) && !hasBody(story.bodyHtml.en)) missingEnParts.push("nội dung");
  const hasEnTitle = hasText(story.title.en);

  return [
    { key: "title", ok: hasText(story.title.vi), label: hasText(story.title.vi) ? "Có tiêu đề" : "Chưa có tiêu đề" },
    {
      key: "cover",
      ok: story.coverMediaId !== null,
      label: story.coverMediaId !== null ? "Có ảnh bìa" : "Chưa có ảnh bìa",
    },
    { key: "excerpt", ok: hasText(story.excerpt.vi), label: hasText(story.excerpt.vi) ? "Có tóm tắt" : "Chưa có tóm tắt" },
    { key: "body", ok: hasBody(story.bodyHtml.vi), label: hasBody(story.bodyHtml.vi) ? "Có nội dung" : "Chưa có nội dung" },
    {
      key: "en",
      ok: hasEnTitle && missingEnParts.length === 0,
      label: !hasEnTitle
        ? "Chưa có bản tiếng Anh"
        : missingEnParts.length > 0
          ? `Bản tiếng Anh còn thiếu: ${missingEnParts.join(", ")}`
          : "Có bản tiếng Anh",
    },
  ];
}

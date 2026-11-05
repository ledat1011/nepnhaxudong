import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StorySummary } from "@/lib/content/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { StoryCard } from "@/components/story/StoryCard";
import { StoriesSection } from "./StoriesSection";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const dict = getDictionary("vi");

function story(n: number): StorySummary {
  return {
    slug: `bai-${n}`,
    title: `[MẪU] Bài ${n}`,
    excerpt: `[MẪU] Trích đoạn ${n}`,
    publishedAt: "2026-04-10T02:00:00Z",
    cover: null,
  };
}

describe("StoryCard", () => {
  it("links to the story page and shows title, excerpt and date", () => {
    render(<StoryCard lang="vi" dict={dict} story={story(1)} />);
    expect(screen.getByRole("link", { name: "[MẪU] Bài 1" })).toHaveAttribute(
      "href",
      "/vi/cau-chuyen/bai-1",
    );
    expect(screen.getByText("[MẪU] Trích đoạn 1")).toBeInTheDocument();
    expect(screen.getByText("10 tháng 4, 2026")).toBeInTheDocument();
    // No cover: the card is text only, with no empty image box.
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("uses the English story path for English", () => {
    render(<StoryCard lang="en" dict={getDictionary("en")} story={story(1)} />);
    expect(screen.getByRole("link", { name: "[MẪU] Bài 1" })).toHaveAttribute(
      "href",
      "/en/stories/bai-1",
    );
  });
});

describe("StoriesSection", () => {
  it("shows at most three story cards and a link to all stories", () => {
    render(
      <StoriesSection lang="vi" dict={dict} stories={[1, 2, 3, 4].map(story)} />,
    );
    expect(screen.getAllByRole("article")).toHaveLength(3);
    expect(screen.queryByText("[MẪU] Bài 4")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: dict.stories.viewAll })).toHaveAttribute(
      "href",
      "/vi/cau-chuyen",
    );
    expect(screen.getByRole("heading", { level: 2, name: dict.sections.story })).toHaveAttribute(
      "id",
      "cau-chuyen",
    );
  });
});

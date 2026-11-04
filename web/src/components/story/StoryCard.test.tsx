import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { StorySummary } from "@/lib/content/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { StoryCard } from "./StoryCard";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const dict = getDictionary("vi");
const story: StorySummary = {
  slug: "bai-1",
  title: "[MẪU] Bài <b>x</b>",
  excerpt: "[MẪU] Trích <i>y</i>",
  publishedAt: "2026-04-10T02:00:00Z",
  cover: null,
};

describe("StoryCard heading level", () => {
  it("uses h3 by default (under the home page h2)", () => {
    render(<StoryCard lang="vi" dict={dict} story={story} />);
    expect(screen.getByRole("heading", { level: 3 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("uses h2 when asked (under the list page h1)", () => {
    render(<StoryCard lang="vi" dict={dict} story={story} headingLevel={2} />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 3 })).not.toBeInTheDocument();
  });
});

describe("StoryCard text", () => {
  it("renders title and excerpt as literal text, not HTML", () => {
    const { container } = render(<StoryCard lang="vi" dict={dict} story={story} />);
    expect(screen.getByRole("link", { name: "[MẪU] Bài <b>x</b>" })).toBeInTheDocument();
    expect(screen.getByText("[MẪU] Trích <i>y</i>")).toBeInTheDocument();
    expect(container.querySelector("b, i")).toBeNull();
  });
});

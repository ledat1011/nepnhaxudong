import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ContentClient, StorySummary } from "@/lib/content/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { StoryCard } from "./StoryCard";
import { STORY_GRID_CLASS, StoryList } from "./StoryList";
import { StoryListSkeleton } from "./StoryListSkeleton";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const dict = getDictionary("vi");

function story(n: number): StorySummary {
  return {
    slug: `bai-${n}`,
    title: `[MẪU] Bài ${n}`,
    excerpt: "[MẪU] Trích đoạn",
    publishedAt: "2026-04-10T02:00:00Z",
    cover: null,
  };
}

function client(stories: StorySummary[]): ContentClient {
  return {
    getHome: vi.fn(),
    getStories: vi.fn(async (_lang, page: number) => (page === 0 ? stories : [])),
    getStory: vi.fn(),
  };
}

describe("StoryList", () => {
  it("loads the stories of the page and shows them as cards", async () => {
    render(await StoryList({ lang: "vi", dict, page: 0, client: client([story(1), story(2)]) }));
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(screen.getByRole("heading", { level: 2, name: "[MẪU] Bài 1" })).toBeInTheDocument();
  });

  it("says so when there are no stories yet", async () => {
    render(await StoryList({ lang: "vi", dict, page: 0, client: client([]) }));
    expect(screen.getByText(dict.stories.empty)).toBeInTheDocument();
  });
});

describe("StoryListSkeleton", () => {
  it("says what is loading in a status region", () => {
    render(<StoryListSkeleton label={dict.loading.stories} />);
    expect(screen.getByRole("status")).toHaveTextContent(dict.loading.stories);
  });

  it("draws cards with the frame, grid and cover size of the real cards", () => {
    const { container: real } = render(
      <StoryCard lang="vi" dict={dict} story={story(1)} headingLevel={2} />,
    );
    const realCard = real.querySelector("article") as HTMLElement;
    const realCover = realCard.firstElementChild as HTMLElement;

    const { container } = render(<StoryListSkeleton label={dict.loading.stories} />);
    const cards = container.querySelectorAll("[data-story-skeleton]");
    expect(cards.length).toBeGreaterThan(0);
    for (const card of cards) {
      expect(card.className).toBe(realCard.className);
      expect(card.firstElementChild?.className).toContain("aspect-[16/9]");
      expect(realCover.className).toContain("aspect-[16/9]");
    }
    const grid = cards[0].closest("ul") as HTMLElement;
    expect(grid.className).toBe(STORY_GRID_CLASS);
  });

  it("hides the grey shapes from screen readers and has no endless animation", () => {
    const { container } = render(<StoryListSkeleton label={dict.loading.stories} />);
    const grid = container.querySelector("ul") as HTMLElement;
    expect(grid).toHaveAttribute("aria-hidden", "true");
    expect(container.innerHTML).not.toMatch(/animate-/);
  });
});

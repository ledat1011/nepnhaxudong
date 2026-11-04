import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HomeData, StoryDetail } from "@/lib/content/types";
import StoryPage from "./page";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const home: HomeData = {
  lang: "vi",
  brand: { tagline: "t" },
  products: [],
  timeline: [],
  press: [],
  stories: [],
  contact: { phone: null, zalo: null, messenger: null, address: null, mapUrl: null, hours: null },
  social: { facebook: null, youtube: null, tiktok: null },
};

const story: StoryDetail = {
  slug: "bai-1",
  title: "[MẪU] Tiêu đề <b>x</b>",
  excerpt: "e",
  publishedAt: "2026-04-10T02:00:00Z",
  cover: null,
  bodyHtml: "<p>Nội dung</p>",
  alternateSlug: null,
};

vi.mock("@/lib/content/client", () => ({
  getContentClient: () => ({
    getHome: async () => home,
    getStory: async () => story,
    getStories: async () => [],
  }),
}));

describe("StoryPage", () => {
  it("renders the title as literal text in the only h1, in the body font", async () => {
    const page = await StoryPage({
      params: Promise.resolve({ lang: "vi", section: "cau-chuyen", slug: "bai-1" }),
    });
    const { container } = render(page);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("[MẪU] Tiêu đề <b>x</b>");
    expect(h1.querySelector("b")).toBeNull();
    expect(container.querySelector("article b")).toBeNull();
    expect(h1).toHaveClass("font-sans", "font-bold");
    expect(h1).not.toHaveClass("font-display");
  });
});

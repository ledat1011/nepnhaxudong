import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

let story: StoryDetail;

const STORY: StoryDetail = {
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
  beforeEach(() => {
    story = STORY;
  });

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

  it("draws no image box when the story has no cover", async () => {
    const page = await StoryPage({
      params: Promise.resolve({ lang: "vi", section: "cau-chuyen", slug: "bai-1" }),
    });
    const { container } = render(page);
    expect(screen.queryByRole("img", { name: "Ảnh sắp được cập nhật" })).not.toBeInTheDocument();
    expect(container.querySelector("[data-story-cover]")).toBeNull();
  });

  it("loads the cover, the top image of the page, at once and with high fetch priority", async () => {
    story = {
      ...STORY,
      cover: { url: "https://cdn.example.com/bia.webp", width: 1600, height: 900, alt: "Ảnh bìa" },
    };
    const page = await StoryPage({
      params: Promise.resolve({ lang: "vi", section: "cau-chuyen", slug: "bai-1" }),
    });
    render(page);
    const cover = screen.getByRole("img", { name: "Ảnh bìa" });
    expect(cover).toHaveAttribute("fetchpriority", "high");
    expect(cover).toHaveAttribute("loading", "eager");
  });
});

import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HomeData, StoryDetail } from "@/lib/content/types";
import StoryPage from "./page";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const BASE_HOME: HomeData = {
  lang: "vi",
  brand: { tagline: "t" },
  products: [],
  timeline: [],
  press: [],
  stories: [],
  contact: { phone: null, zalo: null, messenger: null, address: null, mapUrl: null, hours: null },
  social: { facebook: null, youtube: null, tiktok: null },
};

let home: HomeData;
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
    home = BASE_HOME;
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

describe("StoryPage invitation to order", () => {
  const CONTACT = {
    ...BASE_HOME.contact,
    zalo: "0000 000 000",
    messenger: "https://example.com/messenger",
  };

  beforeEach(() => {
    home = { ...BASE_HOME, contact: CONTACT };
    story = STORY;
  });

  async function renderStory(lang: "vi" | "en") {
    const section = lang === "vi" ? "cau-chuyen" : "stories";
    const page = await StoryPage({ params: Promise.resolve({ lang, section, slug: "bai-1" }) });
    return render(page);
  }

  it("ends the story with an invitation that opens the Zalo panel, before the back link", async () => {
    await renderStory("vi");
    const invite = screen.getByRole("complementary", { name: "Muốn đặt gạo nếp?" });
    const zalo = within(invite).getByRole("link", { name: "Nhắn Zalo cho Nếp Nhà" });
    expect(zalo).toHaveAttribute("href", "https://zalo.me/0000000000");
    expect(zalo).toHaveAttribute("aria-haspopup", "dialog");
    expect(within(invite).queryByRole("link", { name: /Messenger/ })).not.toBeInTheDocument();
    const back = screen.getByRole("link", { name: /Quay lại danh sách/ });
    expect(invite.compareDocumentPosition(back) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("adds Messenger next to Zalo on the English page", async () => {
    await renderStory("en");
    const invite = screen.getByRole("complementary", { name: "Would you like to order sticky rice?" });
    expect(within(invite).getByRole("link", { name: "Message on Zalo" })).toBeInTheDocument();
    expect(
      within(invite).getByRole("link", { name: "Message on Messenger (opens in a new tab)" }),
    ).toHaveAttribute("href", "https://example.com/messenger");
  });

  it("has no invitation when there is no way to message", async () => {
    home = BASE_HOME;
    await renderStory("vi");
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });
});

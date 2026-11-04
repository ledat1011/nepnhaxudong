import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { StoryAdminDto } from "@/lib/admin/types";
import { StoryList } from "./StoryList";

function story(id: number, over: Partial<StoryAdminDto> = {}): StoryAdminDto {
  return {
    id,
    status: "PUBLISHED",
    publishedAt: "2026-10-01T00:00:00Z",
    coverMediaId: null,
    slug: { vi: `bai-${id}`, en: `post-${id}` },
    title: { vi: `Bài ${id}`, en: `Post ${id}` },
    excerpt: { vi: null, en: null },
    bodyHtml: { vi: null, en: null },
    missingEn: false,
    ...over,
  };
}

const stories = [
  story(1, { status: "DRAFT", publishedAt: null, missingEn: true, title: { vi: "Bài 1", en: null } }),
  story(2),
  story(3, { status: "DRAFT", publishedAt: null }),
];

describe("StoryList", () => {
  it("links each story to its edit page and shows the draft and missing-EN labels", () => {
    render(<StoryList stories={stories} />);
    const first = screen.getByRole("link", { name: /Bài 1/ });
    expect(first).toHaveAttribute("href", "/admin/cau-chuyen/1");
    expect(within(first).getByText("Nháp")).toBeInTheDocument();
    expect(within(first).getByText("Thiếu EN")).toBeInTheDocument();
    const second = screen.getByRole("link", { name: /Bài 2/ });
    expect(within(second).queryByText("Nháp")).not.toBeInTheDocument();
    expect(within(second).queryByText("Thiếu EN")).not.toBeInTheDocument();
    expect(within(second).getByText("Đã đăng")).toBeInTheDocument();
  });

  it("filters by status", async () => {
    const events = userEvent.setup();
    render(<StoryList stories={stories} />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
    await events.click(screen.getByRole("button", { name: "Nháp" }));
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual([
      "/admin/cau-chuyen/1",
      "/admin/cau-chuyen/3",
    ]);
    expect(screen.getByRole("button", { name: "Nháp" })).toHaveAttribute("aria-pressed", "true");
    await events.click(screen.getByRole("button", { name: "Đã đăng" }));
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(["/admin/cau-chuyen/2"]);
    await events.click(screen.getByRole("button", { name: "Tất cả" }));
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("says so when no story matches the filter", async () => {
    const events = userEvent.setup();
    render(<StoryList stories={[story(2)]} />);
    await events.click(screen.getByRole("button", { name: "Nháp" }));
    expect(screen.getByText("Không có bài nào.")).toBeInTheDocument();
  });

  it("says so when there is no story at all", () => {
    render(<StoryList stories={[]} />);
    expect(screen.getByText("Chưa có bài nào.")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { StoryAdminDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({ adminFetch: vi.fn(), requireReLogin: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));

import StoriesPage from "./page";

const one: StoryAdminDto = {
  id: 4,
  status: "DRAFT",
  publishedAt: null,
  coverMediaId: null,
  slug: { vi: "a", en: null },
  title: { vi: "Bài bốn", en: null },
  excerpt: { vi: null, en: null },
  bodyHtml: { vi: null, en: null },
  missingEn: true,
};

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  requireReLogin.mockResolvedValue(undefined);
});

describe("Câu chuyện list page", () => {
  it("loads the stories and links to the new-story page", async () => {
    adminFetch.mockResolvedValue([one]);
    render(<StoriesPage />);
    expect(await screen.findByRole("link", { name: /Bài bốn/ })).toHaveAttribute("href", "/admin/cau-chuyen/4");
    expect(screen.getByRole("link", { name: "Viết bài mới" })).toHaveAttribute("href", "/admin/cau-chuyen/moi");
    expect(adminFetch).toHaveBeenCalledWith("/admin/stories");
  });

  it("signs in again after a 401 and loads once more", async () => {
    adminFetch
      .mockRejectedValueOnce(new AdminApiError(401, "Hết phiên.", "session-expired"))
      .mockResolvedValueOnce([one]);
    render(<StoriesPage />);
    expect(await screen.findByRole("link", { name: /Bài bốn/ })).toBeInTheDocument();
    expect(requireReLogin).toHaveBeenCalledTimes(1);
  });

  it("shows the error and retries", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận.")).mockResolvedValueOnce([one]);
    render(<StoriesPage />);
    expect(await screen.findByText("Máy chủ đang bận.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("link", { name: /Bài bốn/ })).toBeInTheDocument();
  });
});

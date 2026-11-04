import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { StoryAdminDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({ adminFetch: vi.fn(), requireReLogin: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import StoryEditPage from "./page";

const saved: StoryAdminDto = {
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

/** The page reads its params with use(), which suspends, so the first render must be awaited. */
async function renderPage(id: string) {
  const params = Promise.resolve({ id });
  await act(async () => {
    render(
      <Suspense fallback={<p>chờ</p>}>
        <StoryEditPage params={params} />
      </Suspense>,
    );
  });
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  requireReLogin.mockResolvedValue(undefined);
});

describe("Câu chuyện edit page", () => {
  it("opens an empty form for the id moi without loading a story", async () => {
    adminFetch.mockResolvedValue([]);
    await renderPage("moi");
    expect(await screen.findByLabelText(/^Tiêu đề( \*)?$/)).toHaveValue("");
    expect(adminFetch).not.toHaveBeenCalledWith("/admin/stories/moi");
  });

  it("loads a story and fills the form", async () => {
    adminFetch.mockImplementation(async (path: string) => (path === "/admin/stories/4" ? saved : []));
    await renderPage("4");
    expect(await screen.findByLabelText(/^Tiêu đề( \*)?$/)).toHaveValue("Bài bốn");
  });

  it("shows the error and loads again after Thử lại", async () => {
    let attempts = 0;
    adminFetch.mockImplementation(async (path: string) => {
      if (path !== "/admin/stories/4") return [];
      attempts += 1;
      if (attempts === 1) throw new AdminApiError(503, "Máy chủ đang bận.");
      return saved;
    });
    await renderPage("4");
    expect(await screen.findByText("Máy chủ đang bận.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByLabelText(/^Tiêu đề( \*)?$/)).toHaveValue("Bài bốn");
  });
});

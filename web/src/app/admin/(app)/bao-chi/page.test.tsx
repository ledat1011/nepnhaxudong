import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { PressMentionAdminDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ requireReLogin }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import PressPage from "./page";

function mention(id: number): PressMentionAdminDto {
  return {
    id,
    url: `https://baochi.example/${id}`,
    sourceName: `Báo ${id}`,
    publishedOn: "2024-05-01",
    title: { vi: `Bài ${id}`, en: `Article ${id}` },
    mediaId: null,
    sortOrder: id * 10,
    missingEn: false,
  };
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
});

describe("Báo chí page", () => {
  it("lists the mentions and opens the edit dialog on tap", async () => {
    adminFetch.mockResolvedValue([mention(1), mention(2)]);
    render(<PressPage />);
    await userEvent.click(await screen.findByRole("button", { name: /^Bài 2/ }));
    expect(await screen.findByRole("heading", { name: "Sửa bài báo" })).toBeInTheDocument();
    expect(adminFetch).toHaveBeenCalledWith("/admin/press");
  });

  it("opens an empty form for a new mention", async () => {
    adminFetch.mockResolvedValue([]);
    render(<PressPage />);
    expect(await screen.findByText("Chưa có bài báo nào.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thêm bài báo" }));
    expect(await screen.findByRole("heading", { name: "Thêm bài báo" })).toBeInTheDocument();
  });

  it("shows the load error with a retry button", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận."));
    adminFetch.mockResolvedValue([mention(1)]);
    render(<PressPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Máy chủ đang bận.");
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("button", { name: /^Bài 1/ })).toBeInTheDocument();
  });

  it("loads the list again and closes the dialog after a save, and locks moves meanwhile", async () => {
    let finishReload: (value: PressMentionAdminDto[]) => void = () => {};
    let loads = 0;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "POST") return mention(2);
      loads += 1;
      if (loads === 1) return [mention(1)];
      return new Promise<PressMentionAdminDto[]>((resolve) => (finishReload = resolve));
    });
    render(<PressPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Thêm bài báo" }));
    await userEvent.type(await screen.findByLabelText(/^Đường dẫn bài báo/), "https://baochi.example/2");
    await userEvent.type(screen.getByLabelText(/^Tên báo/), "Báo 2");
    await userEvent.type(screen.getAllByLabelText(/Tiếng Việt/)[0], "Bài 2");
    await userEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Thêm bài báo" })).not.toBeInTheDocument());
    expect(adminFetch.mock.calls.filter(([path, init]) => path === "/admin/press" && init === undefined)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" })).toBeDisabled();
    finishReload([mention(1), mention(2)]);
    expect(await screen.findByRole("button", { name: /^Bài 2/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" })).toBeEnabled();
  });

  it("reloads the list and keeps the detail when a swap fails half way", async () => {
    let loads = 0;
    let puts = 0;
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method === "PUT") {
        puts += 1;
        if (puts === 2) throw new AdminApiError(503, "Máy chủ đang bận.");
        return mention(1);
      }
      loads += 1;
      // The server now has the half-done order: article 2 first.
      return loads === 1 ? [mention(1), mention(2)] : [{ ...mention(2), sortOrder: 10 }, { ...mention(1), sortOrder: 10 }];
    });
    render(<PressPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Máy chủ đang bận.");
    expect(screen.getByRole("alert")).toHaveTextContent("Danh sách đã được tải lại");
    await waitFor(() => expect(loads).toBe(2));
    await waitFor(() => expect(screen.getByRole("button", { name: "Đưa bài Bài 2 xuống" })).toBeEnabled());
    const names = screen.getAllByRole("listitem").map((item) => item.textContent ?? "");
    expect(names[0]).toContain("Bài 2");
  });
});

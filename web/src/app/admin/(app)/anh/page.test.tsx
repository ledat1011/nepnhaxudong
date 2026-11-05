import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { MediaAdminDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({ adminFetch: vi.fn(), requireReLogin: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
const { uploadWithProgress } = vi.hoisted(() => ({ uploadWithProgress: vi.fn() }));
vi.mock("@/lib/admin/upload-progress", () => ({ uploadWithProgress }));
vi.mock("@/components/admin/media/shrink-image", () => ({ shrinkImage: async (file: File) => ({ file, shrunk: false }) }));

import MediaPage from "./page";

function media(id: number): MediaAdminDto {
  return { id, url: `/media/${id}.webp`, width: 10, height: 10, mime: "image/webp", altVi: `Ảnh ${id}`, altEn: `Image ${id}` };
}

beforeEach(() => {
  adminFetch.mockReset();
  uploadWithProgress.mockReset();
  Object.assign(URL, { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() });
});

describe("Ảnh page", () => {
  it("lists the images, newest first, as the API returns them", async () => {
    adminFetch.mockResolvedValue([media(3), media(2)]);
    render(<MediaPage />);
    const images = await screen.findAllByRole("img");
    expect(images.map((i) => i.getAttribute("alt"))).toEqual(["Ảnh 3", "Ảnh 2"]);
    expect(adminFetch).toHaveBeenCalledWith("/admin/media?page=0");
  });

  it("shows the API detail when the image is still in use", async () => {
    adminFetch.mockImplementation((path: string, init?: { method?: string }) => {
      if (init?.method === "DELETE") return Promise.reject(new AdminApiError(409, "Ảnh đang được dùng."));
      return Promise.resolve([media(3)]);
    });
    const events = userEvent.setup();
    render(<MediaPage />);
    await events.click(await screen.findByAltText("Ảnh 3"));
    const dialog = await screen.findByRole("dialog");
    await events.click(within(dialog).getByRole("button", { name: "Xóa ảnh" }));
    await events.click(await screen.findByRole("button", { name: "Xóa" }));
    expect(await screen.findByText("Ảnh đang được dùng.")).toBeInTheDocument();
    expect(screen.getByAltText("Ảnh 3")).toBeInTheDocument();
  });

  it("removes a deleted image from the grid", async () => {
    adminFetch.mockImplementation((path: string, init?: { method?: string }) =>
      init?.method === "DELETE" ? Promise.resolve(undefined) : Promise.resolve([media(3), media(2)]),
    );
    const events = userEvent.setup();
    render(<MediaPage />);
    await events.click(await screen.findByAltText("Ảnh 3"));
    await events.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Xóa ảnh" }));
    await events.click(await screen.findByRole("button", { name: "Xóa" }));
    await vi.waitFor(() => expect(screen.queryByAltText("Ảnh 3")).not.toBeInTheDocument());
    expect(screen.getByAltText("Ảnh 2")).toBeInTheDocument();
  });

  it("shows a retry button when loading fails", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận.")).mockResolvedValueOnce([media(1)]);
    const events = userEvent.setup();
    render(<MediaPage />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Máy chủ đang bận.");
    await events.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByAltText("Ảnh 1")).toBeInTheDocument();
  });

  it("does not reopen the edit dialog when a save finishes after it was closed", async () => {
    let finish!: (value: MediaAdminDto) => void;
    adminFetch.mockImplementation((path: string, init?: { method?: string }) =>
      init?.method === "PUT" ? new Promise((resolve) => (finish = resolve)) : Promise.resolve([media(3)]),
    );
    const events = userEvent.setup();
    render(<MediaPage />);
    await events.click(await screen.findByAltText("Ảnh 3"));
    const dialog = await screen.findByRole("dialog");
    const en = within(dialog).getByLabelText(/English/);
    await events.clear(en);
    await events.type(en, "Three");
    await events.click(within(dialog).getByRole("button", { name: "Lưu" }));
    await events.keyboard("{Escape}");
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    await act(async () => finish({ ...media(3), altEn: "Three" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("uploads many photos at once, puts them first in the grid and closes the box when all are up", async () => {
    adminFetch.mockResolvedValue([media(3)]);
    uploadWithProgress.mockResolvedValueOnce(media(8)).mockResolvedValueOnce(media(9));
    const events = userEvent.setup();
    render(<MediaPage />);
    await screen.findByAltText("Ảnh 3");
    await events.click(screen.getByRole("button", { name: "Tải ảnh mới" }));
    const dialog = await screen.findByRole("dialog", { name: "Tải ảnh mới" });
    const files = [new File(["a"], "a.jpg", { type: "image/jpeg" }), new File(["b"], "b.jpg", { type: "image/jpeg" })];
    await events.upload(within(dialog).getByLabelText("Chụp hoặc chọn ảnh"), files);
    const first = within(dialog).getByRole("group", { name: /^Ảnh 1\b/ });
    await events.type(within(first).getByLabelText(/Tiếng Việt/), "Ruộng");
    await events.type(within(first).getByLabelText(/English/), "Field");
    await events.click(within(first).getByRole("button", { name: "Dùng mô tả này cho 1 ảnh chưa có mô tả" }));
    await vi.waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    const images = screen.getAllByRole("img");
    expect(images.map((i) => i.getAttribute("alt"))).toEqual(["Ảnh 9", "Ảnh 8", "Ảnh 3"]);
  });
});

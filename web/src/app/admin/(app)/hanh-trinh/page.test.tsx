import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TimelineEventAdminDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ requireReLogin }),
}));
const { toastSuccess } = vi.hoisted(() => ({ toastSuccess: vi.fn() }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));

import TimelinePage from "./page";

function event(id: number, year: number): TimelineEventAdminDto {
  return {
    id,
    year,
    sortOrder: id,
    title: { vi: `Mốc ${id}`, en: `Event ${id}` },
    description: { vi: null, en: null },
    mediaId: null,
    missingEn: false,
  };
}

beforeEach(() => {
  adminFetch.mockReset();
});

describe("Hành trình page", () => {
  it("lists the events and opens the edit dialog on tap", async () => {
    adminFetch.mockResolvedValue([event(1, 1990), event(2, 2000)]);
    render(<TimelinePage />);
    await userEvent.click(await screen.findByRole("button", { name: /^2000/ }));
    expect(await screen.findByRole("heading", { name: "Sửa mốc" })).toBeInTheDocument();
    expect(adminFetch).toHaveBeenCalledWith("/admin/timeline");
  });

  it("opens an empty form for a new event", async () => {
    adminFetch.mockResolvedValue([]);
    render(<TimelinePage />);
    expect(await screen.findByText("Chưa có mốc nào.")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thêm mốc" }));
    expect(await screen.findByRole("heading", { name: "Thêm mốc" })).toBeInTheDocument();
  });

  it("loads the list again and closes the dialog after a save, and locks moves meanwhile", async () => {
    let finishReload: (value: TimelineEventAdminDto[]) => void = () => {};
    let loads = 0;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "POST") return event(2, 2000);
      loads += 1;
      if (loads === 1) return [event(1, 1990)];
      return new Promise<TimelineEventAdminDto[]>((resolve) => (finishReload = resolve));
    });
    render(<TimelinePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Thêm mốc" }));
    await userEvent.type(await screen.findByLabelText(/^Năm/), "2000");
    await userEvent.type(screen.getAllByLabelText(/Tiếng Việt/)[0], "Mốc 2");
    await userEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Thêm mốc" })).not.toBeInTheDocument());
    expect(adminFetch.mock.calls.filter(([path, init]) => path === "/admin/timeline" && init === undefined)).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Đưa mốc Mốc 1 xuống" })).toBeDisabled();
    finishReload([event(1, 1990), event(2, 2000)]);
    expect(await screen.findByRole("button", { name: /^2000/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đưa mốc Mốc 1 xuống" })).toBeEnabled();
  });

  it("opens the event of a dashboard link (?sua=<id>) once, and not again after the list reloads", async () => {
    window.history.replaceState(null, "", "/admin/hanh-trinh?sua=2&o=timeline.title.en");
    adminFetch.mockResolvedValue([event(1, 1990), event(2, 2000)]);
    const events = userEvent.setup();
    render(<TimelinePage />);
    expect(await screen.findByRole("heading", { name: "Sửa mốc" })).toBeInTheDocument();
    expect(screen.getByDisplayValue("Mốc 2")).toBeInTheDocument();
    await events.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("heading", { name: "Sửa mốc" })).not.toBeInTheDocument());
    window.history.replaceState(null, "", "/");
  });

  it("says so when the mốc of a dashboard link is no longer there", async () => {
    window.history.replaceState(null, "", "/admin/hanh-trinh?sua=99");
    adminFetch.mockResolvedValue([event(1, 1990)]);
    render(<TimelinePage />);
    expect(await screen.findByText("Không tìm thấy mục cần sửa. Có thể mục đó đã bị xóa.")).toBeInTheDocument();
    window.history.replaceState(null, "", "/");
  });
  it("puts a new event in its year place after the save, and says so", async () => {
    let loads = 0;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string; body?: unknown }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "POST") return event(2, 1980);
      if (init?.method === "PUT") return undefined;
      loads += 1;
      return loads === 1 ? [event(1, 1990)] : [event(1, 1990), event(2, 1980)];
    });
    render(<TimelinePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Thêm mốc" }));
    await userEvent.type(await screen.findByLabelText(/^Năm/), "1980");
    await userEvent.type(screen.getAllByLabelText(/Tiếng Việt/)[0], "Mốc 2");
    await userEvent.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() =>
      expect(adminFetch).toHaveBeenCalledWith("/admin/timeline/order", { method: "PUT", body: { ids: [2, 1] } }),
    );
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: /^\d{4}/ }).map((b) => b.textContent?.slice(0, 4))).toEqual(["1980", "1990"]),
    );
    expect(toastSuccess).toHaveBeenCalledWith("Đã xếp mốc theo năm.");
    expect(screen.queryByText(/Thứ tự chưa theo năm/)).toBeNull();
  });

  it("does not move anything on its own when the page opens: it warns instead", async () => {
    adminFetch.mockResolvedValue([event(1, 2005), event(2, 1990)]);
    render(<TimelinePage />);
    expect(await screen.findByText(/Thứ tự chưa theo năm/)).toBeInTheDocument();
    expect(adminFetch.mock.calls.some(([path]) => path === "/admin/timeline/order")).toBe(false);
  });

  it("keeps the loaded order and the warning when the year sort after a save fails", async () => {
    let loads = 0;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "POST") return event(2, 1980);
      if (init?.method === "PUT") throw new Error("offline");
      loads += 1;
      return loads === 1 ? [event(1, 1990)] : [event(1, 1990), event(2, 1980)];
    });
    render(<TimelinePage />);
    await userEvent.click(await screen.findByRole("button", { name: "Thêm mốc" }));
    await userEvent.type(await screen.findByLabelText(/^Năm/), "1980");
    await userEvent.type(screen.getAllByLabelText(/Tiếng Việt/)[0], "Mốc 2");
    await userEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText(/Thứ tự chưa theo năm/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Xếp theo năm" })).toBeEnabled();
  });
});

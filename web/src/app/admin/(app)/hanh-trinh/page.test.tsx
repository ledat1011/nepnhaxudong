import { render, screen } from "@testing-library/react";
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
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

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

beforeEach(() => adminFetch.mockReset());

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
});

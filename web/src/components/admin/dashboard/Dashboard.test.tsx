import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { AuditEntryDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));

import { MissingEnSummary } from "./MissingEnSummary";
import { RecentChanges } from "./RecentChanges";
import { Shortcuts } from "./Shortcuts";

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
});

describe("Shortcuts", () => {
  it("has six links to the right screens, the story one to the new-story page", () => {
    render(<Shortcuts />);
    const expected: Record<string, string> = {
      "Viết câu chuyện": "/admin/cau-chuyen/moi",
      "Tải ảnh": "/admin/anh",
      "Sửa sản phẩm": "/admin/san-pham",
      "Thêm mốc hành trình": "/admin/hanh-trinh",
      "Thêm bài báo": "/admin/bao-chi",
      "Liên hệ & cài đặt": "/admin/cai-dat",
    };
    expect(screen.getAllByRole("link")).toHaveLength(6);
    for (const [name, href] of Object.entries(expected)) {
      expect(screen.getByRole("link", { name })).toHaveAttribute("href", href);
    }
  });
});

function entry(id: number): AuditEntryDto {
  return {
    id,
    userDisplayName: "Mẹ",
    entityType: "story",
    entityId: id,
    action: "CREATE",
    createdAt: "2026-11-04T01:00:00Z",
    label: `Bài ${id}`,
    restorable: false,
  };
}

describe("RecentChanges", () => {
  it("shows the first 10 lines of page 0 and a link to the whole history", async () => {
    adminFetch.mockResolvedValue(Array.from({ length: 12 }, (_, i) => entry(i + 1)));
    render(<RecentChanges />);
    expect(await screen.findByText(/Bài 1$/)).toBeInTheDocument();
    expect(adminFetch.mock.calls[0][0]).toBe("/admin/audit?page=0");
    expect(screen.getAllByRole("listitem")).toHaveLength(10);
    expect(screen.queryByText(/Bài 11$/)).not.toBeInTheDocument();
    const first = screen.getAllByRole("listitem")[0];
    expect(first).toHaveTextContent("08:00 04/11/2026");
    expect(first).toHaveTextContent("Câu chuyện");
    expect(first).toHaveTextContent("Tạo");
    expect(screen.getByRole("link", { name: "Xem tất cả" })).toHaveAttribute("href", "/admin/lich-su");
  });

  it("says when there is nothing yet", async () => {
    adminFetch.mockResolvedValue([]);
    render(<RecentChanges />);
    expect(await screen.findByText("Chưa có thay đổi nào.")).toBeInTheDocument();
  });

  it("shows the error with a retry button", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận."));
    adminFetch.mockResolvedValue([entry(1)]);
    render(<RecentChanges />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Máy chủ đang bận.");
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText(/Bài 1$/)).toBeInTheDocument();
  });
});

describe("MissingEnSummary", () => {
  const lists: Record<string, { missingEn: boolean }[]> = {
    "/admin/products": [{ missingEn: true }, { missingEn: false }, { missingEn: true }],
    "/admin/timeline": [{ missingEn: false }],
    "/admin/press": [{ missingEn: true }],
    "/admin/stories": [{ missingEn: true }, { missingEn: true }, { missingEn: true }, { missingEn: false }],
  };

  it("counts the items without English text in each of the four lists, each with a link", async () => {
    adminFetch.mockImplementation(async (path: string) => lists[path]);
    render(<MissingEnSummary />);
    const product = await screen.findByRole("link", { name: /Sản phẩm/ });
    await waitFor(() => expect(product).toHaveTextContent("2"));
    expect(product).toHaveAttribute("href", "/admin/san-pham");
    await waitFor(() => expect(screen.getByRole("link", { name: /Câu chuyện/ })).toHaveTextContent("3"));
    expect(screen.getByRole("link", { name: /Câu chuyện/ })).toHaveAttribute("href", "/admin/cau-chuyen");
    expect(screen.getByRole("link", { name: /Hành trình/ })).toHaveTextContent("0");
    expect(screen.getByRole("link", { name: /Hành trình/ })).toHaveAttribute("href", "/admin/hanh-trinh");
    expect(screen.getByRole("link", { name: /Báo chí/ })).toHaveTextContent("1");
    expect(screen.getByRole("link", { name: /Báo chí/ })).toHaveAttribute("href", "/admin/bao-chi");
  });

  it("shows a small error for the one list that failed and the counts of the others", async () => {
    adminFetch.mockImplementation(async (path: string) => {
      if (path === "/admin/press") throw new AdminApiError(503, "Máy chủ đang bận.");
      return lists[path];
    });
    render(<MissingEnSummary />);
    const press = (await screen.findByText(/Báo chí/)).closest("li") as HTMLElement;
    await waitFor(() => expect(within(press).getByRole("alert")).toHaveTextContent("Không tải được."));
    expect(screen.getAllByRole("alert")).toHaveLength(1);
    await waitFor(() => expect(screen.getByRole("link", { name: /Sản phẩm/ })).toHaveTextContent("2"));
    await waitFor(() => expect(screen.getByRole("link", { name: /Câu chuyện/ })).toHaveTextContent("3"));
    expect(within(press).getByRole("link", { name: /Báo chí/ })).toBeInTheDocument();
  });
});

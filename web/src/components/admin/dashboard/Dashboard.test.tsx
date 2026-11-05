import { render, screen, within } from "@testing-library/react";
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

import { RecentChanges } from "./RecentChanges";
import { Shortcuts } from "./Shortcuts";
import { TodoList } from "./TodoList";

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

  it("opens the history detail of a line when the user taps it", async () => {
    adminFetch.mockResolvedValue([entry(7), { ...entry(8), userDisplayName: null, label: "#8" }]);
    render(<RecentChanges />);
    const link = await screen.findByRole("link", { name: /Bài 7/ });
    expect(link).toHaveAttribute("href", "/admin/lich-su?mo=7");
    const untitled = screen.getByRole("link", { name: /chưa có tiêu đề/ });
    expect(untitled).toHaveAttribute("href", "/admin/lich-su?mo=8");
    expect(untitled).toHaveTextContent("Tài khoản đã xóa");
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

describe("TodoList", () => {
  const product = (id: number, over: Record<string, unknown> = {}) => ({
    id,
    sortOrder: id,
    showPrice: true,
    visible: true,
    name: { vi: `Gạo ${id}`, en: `Rice ${id}` },
    description: { vi: null, en: null },
    features: { vi: [], en: [] },
    cookingTips: { vi: null, en: null },
    packagings: [],
    mediaIds: [1],
    missingEn: false,
    ...over,
  });
  const complete: Record<string, unknown> = {
    "/admin/settings/contact": {
      phone: "0912345678",
      zalo: "0912345678",
      messenger: null,
      address: { vi: "Xuân Đông", en: "Xuan Dong" },
      mapUrl: null,
      hours: { vi: "7 giờ", en: "7 am" },
    },
    "/admin/settings/brand": { tagline: { vi: "Nếp nhà", en: "Family rice" } },
    "/admin/stories": [],
    "/admin/products": [product(1)],
    "/admin/timeline": [],
    "/admin/press": [],
  };

  function answer(lists: Record<string, unknown>, failing: string[] = []) {
    adminFetch.mockImplementation(async (path: string) => {
      if (failing.includes(path)) throw new AdminApiError(503, "Máy chủ đang bận.");
      return lists[path];
    });
  }

  it("asks for all six lists at once, not one after another", () => {
    adminFetch.mockReturnValue(new Promise(() => {}));
    render(<TodoList />);
    expect(adminFetch.mock.calls.map(([path]) => path).sort()).toEqual(Object.keys(complete).sort());
    expect(screen.getByRole("status")).toHaveTextContent("Đang kiểm tra");
  });

  it("says that everything is done when nothing is missing", async () => {
    answer(complete);
    render(<TodoList />);
    expect(await screen.findByText("Mọi thứ đã đủ. Không còn việc nào cần làm.")).toBeInTheDocument();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("lists each gap under its screen, as a link to the field that fixes it", async () => {
    answer({
      ...complete,
      "/admin/settings/contact": { ...(complete["/admin/settings/contact"] as object), zalo: null },
      "/admin/products": [product(3, { description: { vi: "Hạt tròn", en: null }, missingEn: true })],
    });
    render(<TodoList />);
    const zalo = await screen.findByRole("link", { name: "Chưa có số Zalo." });
    expect(zalo).toHaveAttribute("href", "/admin/cai-dat?o=contact.zalo");
    const products = screen.getByRole("region", { name: /Sản phẩm/ });
    expect(within(products).getByRole("link", { name: "Sản phẩm “Gạo 3” thiếu tiếng Anh ở Mô tả." })).toHaveAttribute(
      "href",
      "/admin/san-pham/3?o=product.description.en",
    );
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Việc cần làm (2)");
    expect(screen.queryByText(/Mọi thứ đã đủ/)).not.toBeInTheDocument();
  });

  it("shows five rows of a screen and the rest on request", async () => {
    answer({ ...complete, "/admin/products": [1, 2, 3, 4, 5, 6, 7].map((id) => product(id, { mediaIds: [] })) });
    render(<TodoList />);
    const products = await screen.findByRole("region", { name: /Sản phẩm/ });
    expect(within(products).getAllByRole("link")).toHaveLength(5);
    await userEvent.click(within(products).getByRole("button", { name: "Xem thêm 2 việc" }));
    expect(within(products).getAllByRole("link")).toHaveLength(7);
  });

  it("names a list that could not be checked, never says all done then, and retries only that list", async () => {
    answer(complete, ["/admin/press"]);
    render(<TodoList />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Chưa kiểm tra được: Báo chí.");
    expect(screen.queryByText(/Mọi thứ đã đủ/)).not.toBeInTheDocument();
    answer(complete);
    adminFetch.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Mọi thứ đã đủ. Không còn việc nào cần làm.")).toBeInTheDocument();
    expect(adminFetch.mock.calls.map(([path]) => path)).toEqual(["/admin/press"]);
  });
});

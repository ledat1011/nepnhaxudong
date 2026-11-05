import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { AuditDetailDto, AuditEntryDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
const { session } = vi.hoisted(() => ({ session: { role: "OWNER" as "OWNER" | "MEMBER" } }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin, user: { id: 1, role: session.role } }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { HistoryList } from "./HistoryList";

function entry(id: number, overrides: Partial<AuditEntryDto> = {}): AuditEntryDto {
  return {
    id,
    userDisplayName: "Mẹ",
    entityType: "product",
    entityId: id,
    action: "UPDATE",
    createdAt: "2026-11-04T01:00:00Z",
    label: `Mục ${id}`,
    restorable: true,
    ...overrides,
  };
}

function fullPage(from: number): AuditEntryDto[] {
  return Array.from({ length: 50 }, (_, i) => entry(from + i));
}

function listCalls() {
  return adminFetch.mock.calls.map(([path]) => path as string).filter((path) => path.startsWith("/admin/audit?"));
}

function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  const promise = new Promise<T>((r) => (resolve = r));
  return { promise, resolve };
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  session.role = "OWNER";
});

describe("HistoryList filter by role", () => {
  it("offers the account kind to an owner", async () => {
    adminFetch.mockResolvedValue([]);
    render(<HistoryList />);
    await screen.findByText("Chưa có thay đổi nào.");
    expect(screen.getByRole("option", { name: "Tài khoản" })).toBeInTheDocument();
  });

  it("does not offer the account kind to a member, whose list has no account lines", async () => {
    session.role = "MEMBER";
    adminFetch.mockResolvedValue([]);
    render(<HistoryList />);
    await screen.findByText("Chưa có thay đổi nào.");
    expect(screen.queryByRole("option", { name: "Tài khoản" })).not.toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Câu chuyện" })).toBeInTheDocument();
  });
});

describe("HistoryList", () => {
  it("shows time (Vietnam), user, kind, action and label of each line", async () => {
    adminFetch.mockResolvedValue([entry(1, { entityType: "timeline_event", action: "DELETE", label: "Năm 1990" })]);
    render(<HistoryList />);
    const row = await screen.findByRole("button", { name: /Năm 1990/ });
    expect(row).toHaveTextContent("08:00 04/11/2026");
    expect(row).toHaveTextContent("Mẹ");
    expect(row).toHaveTextContent("Hành trình");
    expect(row).toHaveTextContent("Xóa");
    expect(listCalls()).toEqual(["/admin/audit?page=0"]);
  });

  it("says when there is no line", async () => {
    adminFetch.mockResolvedValue([]);
    render(<HistoryList />);
    expect(await screen.findByText("Chưa có thay đổi nào.")).toBeInTheDocument();
  });

  it("filters by kind and goes back to page 0 when the filter changes", async () => {
    adminFetch.mockImplementation(async (path: string) => (path.includes("page=0") ? fullPage(100) : [entry(1)]));
    render(<HistoryList />);
    await screen.findByRole("button", { name: /Mục 100/ });
    await userEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    await screen.findByRole("button", { name: /^Mục 1 / });
    expect(listCalls().at(-1)).toBe("/admin/audit?page=1");
    adminFetch.mockClear();
    adminFetch.mockResolvedValue([entry(2)]);
    await userEvent.selectOptions(screen.getByLabelText("Loại nội dung"), "story");
    await screen.findByRole("button", { name: /^Mục 2 / });
    expect(listCalls()).toEqual(["/admin/audit?entityType=story&page=0"]);
  });

  it("enables the next page only after a full page and the previous page only after the first", async () => {
    adminFetch.mockResolvedValue(fullPage(1));
    render(<HistoryList />);
    await screen.findByRole("button", { name: /^Mục 1 / });
    expect(screen.getByRole("button", { name: "Trang trước" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Trang sau" })).toBeEnabled();
    adminFetch.mockResolvedValue([entry(900)]);
    await userEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    await screen.findByRole("button", { name: /Mục 900/ });
    expect(screen.getByRole("button", { name: "Trang sau" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Trang trước" })).toBeEnabled();
  });

  it("does not let a slow answer for an old filter replace the answer for the new filter", async () => {
    const slow = deferred<AuditEntryDto[]>();
    adminFetch.mockImplementation((path: string) => {
      if (path === "/admin/audit?page=0") return Promise.resolve([entry(1)]);
      if (path === "/admin/audit?entityType=story&page=0") return slow.promise;
      return Promise.resolve([entry(3, { label: "Ảnh mới" })]);
    });
    render(<HistoryList />);
    await screen.findByRole("button", { name: /^Mục 1 / });
    await userEvent.selectOptions(screen.getByLabelText("Loại nội dung"), "story");
    await userEvent.selectOptions(screen.getByLabelText("Loại nội dung"), "media");
    await screen.findByRole("button", { name: /Ảnh mới/ });
    await act(async () => {
      slow.resolve([entry(2, { label: "Câu chuyện cũ" })]);
    });
    expect(screen.queryByText(/Câu chuyện cũ/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ảnh mới/ })).toBeInTheDocument();
  });

  it("does not let a slow answer for an old page replace the answer for the new page", async () => {
    const slow = deferred<AuditEntryDto[]>();
    adminFetch.mockImplementation((path: string) => {
      if (path === "/admin/audit?page=0") return Promise.resolve(fullPage(100));
      if (path === "/admin/audit?page=1") return slow.promise;
      return Promise.resolve([entry(5, { label: "Trang hai" })]);
    });
    render(<HistoryList />);
    await screen.findByRole("button", { name: /Mục 100/ });
    await userEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    // Back to page 0 before page 1 answers; the answer for page 1 must be dropped.
    await userEvent.click(screen.getByRole("button", { name: "Trang trước" }));
    await screen.findByRole("button", { name: /Mục 100/ });
    await act(async () => {
      slow.resolve([entry(6, { label: "Trang một cũ" })]);
    });
    expect(screen.queryByText(/Trang một cũ/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mục 100/ })).toBeInTheDocument();
  });

  it("says the list is over on an empty page after the first, and keeps the previous-page button", async () => {
    adminFetch.mockImplementation(async (path: string) => (path.includes("page=0") ? fullPage(1) : []));
    render(<HistoryList />);
    await screen.findByRole("button", { name: /^Mục 1 / });
    await userEvent.click(screen.getByRole("button", { name: "Trang sau" }));
    expect(await screen.findByText("Hết danh sách.")).toBeInTheDocument();
    expect(screen.queryByText("Chưa có thay đổi nào.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trang trước" })).toBeEnabled();
  });

  it("shows a load error with a retry button", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận."));
    adminFetch.mockResolvedValue([entry(1)]);
    render(<HistoryList />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Máy chủ đang bận.");
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("button", { name: /^Mục 1 / })).toBeInTheDocument();
  });

  it("opens a line, and after a restore loads both the list and the open detail again", async () => {
    let listLoads = 0;
    let detailLoads = 0;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (init?.method === "POST") return undefined;
      if (path === "/admin/audit/5") {
        detailLoads += 1;
        const dto: AuditDetailDto = { ...entry(5), before: { a: "x" }, after: { a: "y" } };
        return dto;
      }
      listLoads += 1;
      return [entry(5)];
    });
    render(<HistoryList />);
    await userEvent.click(await screen.findByRole("button", { name: /Mục 5/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Khôi phục bản trước" }));
    const dialog = await screen.findByRole("alertdialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Khôi phục" }));
    await waitFor(() => expect(listLoads).toBe(2));
    await waitFor(() => expect(detailLoads).toBe(2));
    expect(screen.getByRole("table")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Quay lại danh sách" }));
    expect(await screen.findByLabelText("Loại nội dung")).toBeVisible();
  });

  it("keeps the filter and the page when the user goes back from a detail", async () => {
    adminFetch.mockImplementation(async (path: string) => {
      if (path === "/admin/audit/5") return { ...entry(5), before: { a: 1 }, after: { a: 2 } };
      return [entry(5)];
    });
    render(<HistoryList />);
    await screen.findByRole("button", { name: /Mục 5/ });
    await userEvent.selectOptions(screen.getByLabelText("Loại nội dung"), "story");
    await userEvent.click(await screen.findByRole("button", { name: /Mục 5/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Quay lại danh sách" }));
    expect(screen.getByLabelText("Loại nội dung")).toHaveValue("story");
  });
});

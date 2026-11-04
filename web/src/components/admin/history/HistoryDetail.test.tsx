import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { AuditDetailDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin, toastSuccess } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
  toastSuccess: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));

import { HistoryDetail } from "./HistoryDetail";

function detail(overrides: Partial<AuditDetailDto> = {}): AuditDetailDto {
  return {
    id: 7,
    userDisplayName: "Mẹ",
    entityType: "product",
    entityId: 3,
    action: "UPDATE",
    createdAt: "2026-11-04T01:00:00Z",
    label: "Nếp cái hoa vàng",
    restorable: true,
    before: { name: { vi: "Nếp cũ", en: null }, packagings: [{ weightGrams: 500 }] },
    after: { name: { vi: "Nếp mới", en: null }, packagings: [{ weightGrams: 1000 }] },
    ...overrides,
  };
}

function posts() {
  return adminFetch.mock.calls.filter(([, init]) => init?.method === "POST");
}

function detailLoads(id = 7) {
  return adminFetch.mock.calls.filter(([path, init]) => path === `/admin/audit/${id}` && init?.method !== "POST");
}

async function askToRestore() {
  await userEvent.click(await screen.findByRole("button", { name: "Khôi phục bản trước" }));
  return screen.findByRole("alertdialog");
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  toastSuccess.mockReset();
});

describe("HistoryDetail", () => {
  it("shows who, what, when in Vietnam time and a Before / After table of the changed fields", async () => {
    adminFetch.mockResolvedValue(detail());
    render(<HistoryDetail id={7} onRestored={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText("Nếp cái hoa vàng")).toBeInTheDocument();
    expect(screen.getByText(/08:00 04\/11\/2026/)).toBeInTheDocument();
    expect(screen.getByText(/Mẹ/)).toBeInTheDocument();
    expect(adminFetch.mock.calls[0][0]).toBe("/admin/audit/7");
    const table = screen.getByRole("table");
    expect(within(table).getByRole("columnheader", { name: "Trước" })).toBeInTheDocument();
    expect(within(table).getByRole("columnheader", { name: "Sau" })).toBeInTheDocument();
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("name.vi");
    expect(rows[0]).toHaveTextContent("Nếp cũ");
    expect(rows[0]).toHaveTextContent("Nếp mới");
    expect(rows[1]).toHaveTextContent("packagings.0.weightGrams");
  });

  it("shows a value that looks like markup as plain text", async () => {
    adminFetch.mockResolvedValue(detail({ before: { t: "<b>x</b>" }, after: { t: "<img src=x onerror=alert(1)>" } }));
    const { container } = render(<HistoryDetail id={7} onRestored={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText("<b>x</b>")).toBeInTheDocument();
    expect(container.querySelector("b, img")).toBeNull();
  });

  it("says when nothing differs", async () => {
    adminFetch.mockResolvedValue(detail({ before: { a: 1 }, after: { a: 1 } }));
    render(<HistoryDetail id={7} onRestored={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText("Không có thay đổi nào.")).toBeInTheDocument();
  });

  it("has no restore button when the line is not restorable", async () => {
    adminFetch.mockResolvedValue(detail({ restorable: false }));
    render(<HistoryDetail id={7} onRestored={vi.fn()} onClose={vi.fn()} />);
    await screen.findByText("Nếp cái hoa vàng");
    expect(screen.queryByRole("button", { name: "Khôi phục bản trước" })).not.toBeInTheDocument();
  });

  it("asks first and sends nothing when the user cancels", async () => {
    adminFetch.mockResolvedValue(detail());
    render(<HistoryDetail id={7} onRestored={vi.fn()} onClose={vi.fn()} />);
    const dialog = await askToRestore();
    await userEvent.click(within(dialog).getByRole("button", { name: "Hủy" }));
    expect(posts()).toHaveLength(0);
  });

  it("restores after the confirmation, shows the toast, reloads the detail and tells the list", async () => {
    const onRestored = vi.fn();
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string }) => (init?.method === "POST" ? undefined : detail()));
    render(<HistoryDetail id={7} onRestored={onRestored} onClose={vi.fn()} />);
    const dialog = await askToRestore();
    await userEvent.click(within(dialog).getByRole("button", { name: "Khôi phục" }));
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1));
    expect(posts()).toHaveLength(1);
    expect(posts()[0][0]).toBe("/admin/audit/7/restore");
    expect(toastSuccess).toHaveBeenCalledWith("Đã khôi phục.");
    await waitFor(() => expect(detailLoads()).toHaveLength(2));
  });

  it("sends one request even when the button is tapped again while it runs", async () => {
    let finish: () => void = () => {};
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method === "POST") return new Promise<void>((resolve) => (finish = resolve));
      return detail();
    });
    render(<HistoryDetail id={7} onRestored={vi.fn()} onClose={vi.fn()} />);
    const dialog = await askToRestore();
    await userEvent.click(within(dialog).getByRole("button", { name: "Khôi phục" }));
    await waitFor(() => expect(posts()).toHaveLength(1));
    const button = screen.getByRole("button", { name: "Khôi phục bản trước" });
    expect(button).toBeDisabled();
    await userEvent.click(button);
    expect(posts()).toHaveLength(1);
    finish();
    await waitFor(() => expect(button).toBeEnabled());
  });

  it("shows the API detail on a 409 and does not tell the list", async () => {
    const onRestored = vi.fn();
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method === "POST") throw new AdminApiError(409, "Sản phẩm này đã bị xóa.");
      return detail();
    });
    render(<HistoryDetail id={7} onRestored={onRestored} onClose={vi.fn()} />);
    const dialog = await askToRestore();
    await userEvent.click(within(dialog).getByRole("button", { name: "Khôi phục" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sản phẩm này đã bị xóa.");
    expect(onRestored).not.toHaveBeenCalled();
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("signs in again after a 401 and restores once more", async () => {
    requireReLogin.mockResolvedValue(undefined);
    let attempts = 0;
    adminFetch.mockImplementation(async (_path: string, init?: { method?: string }) => {
      if (init?.method === "POST") {
        attempts += 1;
        if (attempts === 1) throw new AdminApiError(401, "Phiên đã hết hạn.", "session-expired");
        return undefined;
      }
      return detail();
    });
    const onRestored = vi.fn();
    render(<HistoryDetail id={7} onRestored={onRestored} onClose={vi.fn()} />);
    const dialog = await askToRestore();
    await userEvent.click(within(dialog).getByRole("button", { name: "Khôi phục" }));
    await waitFor(() => expect(onRestored).toHaveBeenCalledTimes(1));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(posts()).toHaveLength(2);
  });

  it("shows a load error with a retry button", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(404, "Không tìm thấy dòng lịch sử."));
    adminFetch.mockResolvedValue(detail());
    render(<HistoryDetail id={7} onRestored={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy dòng lịch sử.");
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Nếp cái hoa vàng")).toBeInTheDocument();
  });

  it("does not let a slow answer for an old line replace the new line", async () => {
    let finishOld: (value: AuditDetailDto) => void = () => {};
    adminFetch.mockImplementation((path: string) =>
      path === "/admin/audit/7"
        ? new Promise<AuditDetailDto>((resolve) => (finishOld = resolve))
        : Promise.resolve(detail({ id: 8, label: "Dòng mới" })),
    );
    const { rerender } = render(<HistoryDetail id={7} onRestored={vi.fn()} onClose={vi.fn()} />);
    rerender(<HistoryDetail id={8} onRestored={vi.fn()} onClose={vi.fn()} />);
    expect(await screen.findByText("Dòng mới")).toBeInTheDocument();
    finishOld(detail({ label: "Dòng cũ" }));
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(screen.queryByText("Dòng cũ")).not.toBeInTheDocument();
    expect(screen.getByText("Dòng mới")).toBeInTheDocument();
  });

  it("calls onClose from the back button", async () => {
    adminFetch.mockResolvedValue(detail());
    const onClose = vi.fn();
    render(<HistoryDetail id={7} onRestored={vi.fn()} onClose={onClose} />);
    await userEvent.click(await screen.findByRole("button", { name: "Quay lại danh sách" }));
    expect(onClose).toHaveBeenCalled();
  });
});

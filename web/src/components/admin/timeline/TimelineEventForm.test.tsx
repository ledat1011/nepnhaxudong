import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminApiError } from "@/lib/admin/errors";
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

import { TimelineEventForm } from "./TimelineEventForm";

function existing(): TimelineEventAdminDto {
  return {
    id: 5,
    year: 2005,
    sortOrder: 2,
    title: { vi: "Thành lập", en: "Founded" },
    description: { vi: null, en: null },
    mediaId: null,
    missingEn: false,
  };
}

function writes() {
  return adminFetch.mock.calls.filter(([, init]) => ["PUT", "POST", "DELETE"].includes(init?.method));
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path.startsWith("/admin/media")) return [];
    if (init?.method === "POST" || init?.method === "PUT") return existing();
    return undefined;
  });
});

describe("TimelineEventForm", () => {
  it("reports a year of 1899 at once and does not call the API", async () => {
    const user = userEvent.setup();
    render(<TimelineEventForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    const year = screen.getByLabelText(/^Năm/);
    await user.clear(year);
    await user.type(year, "1899");
    expect(screen.getByText("Năm phải nằm trong khoảng 1900 đến 2100.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(writes()).toHaveLength(0);
  });

  it("disables Lưu while the Vietnamese title is empty", async () => {
    const user = userEvent.setup();
    render(<TimelineEventForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(screen.getByLabelText(/^Năm/), "2020");
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
    await user.type(screen.getAllByLabelText(/Tiếng Việt/)[0], "Một mốc");
    expect(screen.getByRole("button", { name: "Lưu" })).toBeEnabled();
  });

  it("creates with POST, trims the text, sends null for blank boxes, and locks the form", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<TimelineEventForm onClose={vi.fn()} onChanged={onChanged} />);
    await user.type(screen.getByLabelText(/^Năm/), "2020");
    await user.type(screen.getAllByLabelText(/Tiếng Việt/)[0], "  Mốc mới  ");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(writes()).toEqual([
      [
        "/admin/timeline",
        {
          method: "POST",
          body: {
            year: 2020,
            title: { vi: "Mốc mới", en: null },
            description: { vi: null, en: null },
            mediaId: null,
          },
        },
      ],
    ]);
    expect(screen.getByRole("button", { name: /Lưu/ })).toBeDisabled();
  });

  it("updates with PUT without a sort order, so the event keeps its place", async () => {
    const user = userEvent.setup();
    render(<TimelineEventForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(screen.getAllByLabelText("English")[0], " 2");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0][0]).toBe("/admin/timeline/5");
    expect(writes()[0][1].method).toBe("PUT");
    expect(writes()[0][1].body).not.toHaveProperty("sortOrder");
    expect(writes()[0][1].body.title).toEqual({ vi: "Thành lập", en: "Founded 2" });
  });

  it("deletes after confirmation and then locks the form", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<TimelineEventForm initial={existing()} onClose={vi.fn()} onChanged={onChanged} />);
    await user.click(screen.getByRole("button", { name: "Xóa mốc" }));
    await user.click(await screen.findByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(writes()).toEqual([["/admin/timeline/5", { method: "DELETE" }]]);
    expect(screen.getByRole("button", { name: "Xóa mốc" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
  });

  it("shows the year message for junk such as 1e", async () => {
    const user = userEvent.setup();
    render(<TimelineEventForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    const year = screen.getByLabelText(/^Năm/);
    await user.clear(year);
    await user.type(year, "1e");
    expect(screen.getByText("Năm phải nằm trong khoảng 1900 đến 2100.")).toBeInTheDocument();
  });

  it("disables Lưu for a whitespace-only Vietnamese title", async () => {
    const user = userEvent.setup();
    render(<TimelineEventForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(screen.getByLabelText(/^Năm/), "2020");
    await user.type(screen.getAllByLabelText(/Tiếng Việt/)[0], "   ");
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
  });

  it("closes at once when nothing changed", async () => {
    const onClose = vi.fn();
    render(<TimelineEventForm initial={existing()} onClose={onClose} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  describe("with unsaved changes", () => {
    async function dirtyForm() {
      const user = userEvent.setup();
      const onClose = vi.fn();
      render(<TimelineEventForm initial={existing()} onClose={onClose} onChanged={vi.fn()} />);
      await user.type(screen.getAllByLabelText("English")[0], "!");
      return { user, onClose };
    }

    it("asks before Hủy closes, and Bỏ thay đổi closes", async () => {
      const { user, onClose } = await dirtyForm();
      await user.click(screen.getByRole("button", { name: "Hủy" }));
      expect(onClose).not.toHaveBeenCalled();
      await user.click(await screen.findByRole("button", { name: "Bỏ thay đổi" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("asks before the X button closes", async () => {
      const { user, onClose } = await dirtyForm();
      await user.click(screen.getByRole("button", { name: "Đóng" }));
      expect(await screen.findByText("Bỏ thay đổi chưa lưu?")).toBeInTheDocument();
      expect(onClose).not.toHaveBeenCalled();
    });

    it("asks before Escape closes, and cancelling keeps the dialog and the text", async () => {
      const { user, onClose } = await dirtyForm();
      await user.keyboard("{Escape}");
      const question = await screen.findByRole("alertdialog");
      expect(question).toHaveTextContent("Bỏ thay đổi chưa lưu?");
      await user.click(within(question).getByRole("button", { name: "Hủy" }));
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("heading", { name: "Sửa mốc" })).toBeInTheDocument();
      expect(screen.getAllByLabelText("English")[0]).toHaveValue("Founded!");
    });
  });

  it("signs in again on session-expired and sends the same body with the typed text kept", async () => {
    const user = userEvent.setup();
    requireReLogin.mockResolvedValue(undefined);
    let first = true;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT" && first) {
        first = false;
        throw new AdminApiError(401, "Phiên đã hết hạn.", "session-expired");
      }
      return existing();
    });
    render(<TimelineEventForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(screen.getAllByLabelText("English")[0], "?");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(writes()[1][1].body).toEqual(writes()[0][1].body);
    expect(writes()[0][1].body.title.en).toBe("Founded?");
  });
});

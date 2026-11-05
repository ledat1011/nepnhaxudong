import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { TimelineEventAdminDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ requireReLogin }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { TimelineList } from "./TimelineList";

function event(id: number, year: number, missingEn = false): TimelineEventAdminDto {
  return {
    id,
    year,
    sortOrder: id,
    title: { vi: `Mốc ${id}`, en: missingEn ? null : `Event ${id}` },
    description: { vi: null, en: null },
    mediaId: null,
    missingEn,
  };
}

const EVENTS = [event(1, 1990), event(2, 2000, true), event(3, 2010)];

/** The Vietnamese titles in the order shown on screen. */
function shownOrder(): string[] {
  return screen.getAllByRole("listitem").map((item) => {
    const text = within(item).getByRole("button", { name: /^\d{4}/ }).textContent ?? "";
    return /Mốc \d/.exec(text)?.[0] ?? "";
  });
}

function orderCalls() {
  return adminFetch.mock.calls.filter(([path]) => path === "/admin/timeline/order");
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  adminFetch.mockResolvedValue(undefined);
});

describe("TimelineList", () => {
  it("shows the events with the year and the missing-EN badge, and selects one on tap", async () => {
    const onSelect = vi.fn();
    render(<TimelineList events={EVENTS} onSelect={onSelect} />);
    const second = screen.getByRole("button", { name: /^2000/ });
    expect(second).toHaveTextContent("2000");
    expect(second).toHaveTextContent("Thiếu EN");
    await userEvent.click(second);
    expect(onSelect).toHaveBeenCalledWith(EVENTS[1]);
  });

  it("sends the swapped ids when the first event is moved down", async () => {
    render(<TimelineList events={EVENTS} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa mốc Mốc 1 xuống" }));
    await waitFor(() => expect(orderCalls()).toHaveLength(1));
    expect(orderCalls()[0]).toEqual(["/admin/timeline/order", { method: "PUT", body: { ids: [2, 1, 3] } }]);
    expect(shownOrder()).toEqual(["Mốc 2", "Mốc 1", "Mốc 3"]);
  });

  it("restores the old order and shows the detail when the API answers 400", async () => {
    adminFetch.mockRejectedValue(new AdminApiError(400, "Thiếu mã mốc: 3."));
    render(<TimelineList events={EVENTS} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa mốc Mốc 1 xuống" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Thiếu mã mốc: 3.");
    expect(shownOrder()).toEqual(["Mốc 1", "Mốc 2", "Mốc 3"]);
  });

  it("signs in again on a session-expired error and sends the same ids once more", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(401, "Phiên đã hết hạn.", "session-expired"));
    requireReLogin.mockResolvedValue(undefined);
    render(<TimelineList events={EVENTS} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa mốc Mốc 3 lên" }));
    await waitFor(() => expect(orderCalls()).toHaveLength(2));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(orderCalls()[0][1].body).toEqual({ ids: [1, 3, 2] });
    expect(orderCalls()[1][1].body).toEqual({ ids: [1, 3, 2] });
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(shownOrder()).toEqual(["Mốc 1", "Mốc 3", "Mốc 2"]);
  });

  it("ignores a second move while the first is still being saved", async () => {
    let finish: () => void = () => {};
    adminFetch.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    render(<TimelineList events={EVENTS} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa mốc Mốc 1 xuống" }));
    expect(screen.getByRole("button", { name: "Đưa mốc Mốc 3 lên" })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Đưa mốc Mốc 3 lên" })).toBeEnabled());
    expect(orderCalls()).toHaveLength(1);
  });

  it("disables up on the first event and down on the last", () => {
    render(<TimelineList events={EVENTS} onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Đưa mốc Mốc 1 lên" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đưa mốc Mốc 3 xuống" })).toBeDisabled();
  });

  it("disables every move control and row while the parent reloads the list", () => {
    render(<TimelineList events={EVENTS} refreshing onSelect={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Đưa mốc Mốc 2 lên" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đưa mốc Mốc 2 xuống" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Kéo mốc Mốc 2" })).toBeDisabled();
  });

  it("clears an old reorder error when a new list arrives", async () => {
    adminFetch.mockRejectedValue(new AdminApiError(400, "Thiếu mã mốc: 3."));
    const { rerender } = render(<TimelineList events={EVENTS} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa mốc Mốc 1 xuống" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    rerender(<TimelineList events={[...EVENTS, event(4, 2020)]} onSelect={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  async function failAfterReload() {
    let fail: (e: Error) => void = () => {};
    adminFetch
      .mockResolvedValueOnce(undefined)
      .mockReturnValueOnce(new Promise<void>((_, reject) => (fail = reject)));
    const view = render(<TimelineList events={EVENTS} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa mốc Mốc 1 xuống" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Đưa mốc Mốc 3 lên" })).toBeEnabled());
    expect(shownOrder()).toEqual(["Mốc 2", "Mốc 1", "Mốc 3"]);
    await userEvent.click(screen.getByRole("button", { name: "Đưa mốc Mốc 3 lên" }));
    view.rerender(<TimelineList events={[event(4, 2020), event(5, 2030)]} onSelect={vi.fn()} />);
    fail(new AdminApiError(400, "Lỗi."));
    await waitFor(() => expect(screen.getByRole("button", { name: "Đưa mốc Mốc 5 lên" })).toBeEnabled());
  }

  it("does not roll back to the old order when the failing save finishes after a reload", async () => {
    await failAfterReload();
    expect(shownOrder()).toEqual(["Mốc 4", "Mốc 5"]);
  });

  it("shows no error for a list that was replaced while the save ran", async () => {
    await failAfterReload();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not open a row while a reorder is being saved", async () => {
    adminFetch.mockReturnValue(new Promise<void>(() => {}));
    render(<TimelineList events={EVENTS} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa mốc Mốc 1 xuống" }));
    expect(screen.getByRole("button", { name: /^2000/ })).toBeDisabled();
  });
  it("says nothing about the order while it follows the years", () => {
    render(<TimelineList events={EVENTS} onSelect={vi.fn()} />);
    expect(screen.queryByText(/Thứ tự chưa theo năm/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Xếp theo năm" })).toBeNull();
  });

  it("warns when a later year stands before an earlier one, and Xếp theo năm saves the year order", async () => {
    render(<TimelineList events={[event(1, 1990), event(3, 2010), event(2, 2000)]} onSelect={vi.fn()} />);
    expect(screen.getByText(/Thứ tự chưa theo năm/)).toHaveTextContent(
      "Thứ tự chưa theo năm: mốc 2010 (Mốc 3) đang đứng trước mốc 2000 (Mốc 2). Trang web hiện đúng thứ tự này.",
    );
    await userEvent.click(screen.getByRole("button", { name: "Xếp theo năm" }));
    await waitFor(() => expect(orderCalls()).toHaveLength(1));
    expect(orderCalls()[0][1]).toEqual({ method: "PUT", body: { ids: [1, 2, 3] } });
    expect(shownOrder()).toEqual(["Mốc 1", "Mốc 2", "Mốc 3"]);
    expect(screen.queryByText(/Thứ tự chưa theo năm/)).toBeNull();
  });

  it("warns at once when a move breaks the year order", async () => {
    render(<TimelineList events={EVENTS} onSelect={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa mốc Mốc 1 xuống" }));
    expect(await screen.findByText(/Thứ tự chưa theo năm/)).toHaveTextContent("mốc 2000 (Mốc 2) đang đứng trước mốc 1990 (Mốc 1)");
  });
});

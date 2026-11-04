import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { PressMentionAdminDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ requireReLogin }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { PressList } from "./PressList";

function mention(id: number, sortOrder = id * 10, missingEn = false): PressMentionAdminDto {
  return {
    id,
    url: `https://baochi.example/${id}`,
    sourceName: `Báo ${id}`,
    publishedOn: "2024-05-01",
    title: { vi: `Bài ${id}`, en: missingEn ? null : `Article ${id}` },
    mediaId: id === 2 ? 9 : null,
    sortOrder,
    missingEn,
  };
}

const ITEMS = [mention(1), mention(2, 20, true), mention(3)];

/** The Vietnamese titles in the order shown on screen. */
function shownOrder(): string[] {
  return screen
    .getAllByRole("listitem")
    .map((item) => /Bài \d/.exec(within(item).getByRole("button", { name: /^Bài/ }).textContent ?? "")?.[0] ?? "");
}

function puts() {
  return adminFetch.mock.calls.filter(([, init]) => init?.method === "PUT");
}

function sortOrdersWritten(): Record<string, number> {
  return Object.fromEntries(puts().map(([path, init]) => [path, init.body.sortOrder]));
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  adminFetch.mockResolvedValue(undefined);
});

describe("PressList", () => {
  it("shows title, source, date and the missing-EN badge, and selects one on tap", async () => {
    const onSelect = vi.fn();
    render(<PressList items={ITEMS} onSelect={onSelect} onPartialFailure={vi.fn()} />);
    const second = screen.getByRole("button", { name: /^Bài 2/ });
    expect(second).toHaveTextContent("Báo 2");
    expect(second).toHaveTextContent("01/05/2024");
    expect(second).toHaveTextContent("Thiếu EN");
    await userEvent.click(second);
    expect(onSelect).toHaveBeenCalledWith(ITEMS[1]);
  });

  it("swaps the sort orders with two PUTs of whole mentions when the first is moved down", async () => {
    render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    await waitFor(() => expect(puts()).toHaveLength(2));
    const byId = Object.fromEntries(puts().map(([path, init]) => [path, init.body]));
    expect(byId["/admin/press/1"]).toEqual({
      url: "https://baochi.example/1",
      sourceName: "Báo 1",
      publishedOn: "2024-05-01",
      title: { vi: "Bài 1", en: "Article 1" },
      mediaId: null,
      sortOrder: 20,
    });
    expect(byId["/admin/press/2"]).toMatchObject({ sortOrder: 10, mediaId: 9, title: { vi: "Bài 2", en: null } });
    await waitFor(() => expect(shownOrder()).toEqual(["Bài 2", "Bài 1", "Bài 3"]));
  });

  it("uses the new sort orders for the next move", async () => {
    render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Đưa bài Bài 3 lên" })).toBeEnabled());
    adminFetch.mockClear();
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 3 lên" }));
    await waitFor(() => expect(puts()).toHaveLength(2));
    expect(sortOrdersWritten()).toEqual({ "/admin/press/3": 20, "/admin/press/1": 30 });
  });

  it("renumbers when two mentions have the same sort order, so the move still changes the order", async () => {
    const same = [mention(1, 0), mention(2, 0), mention(3, 0)];
    render(<PressList items={same} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    await waitFor(() => expect(shownOrder()).toEqual(["Bài 2", "Bài 1", "Bài 3"]));
    await waitFor(() => expect(puts()).toHaveLength(2));
    expect(sortOrdersWritten()).toEqual({ "/admin/press/1": 1, "/admin/press/3": 2 });
  });

  it("restores the old order and shows the detail when the first PUT fails, and reports no partial failure", async () => {
    adminFetch.mockRejectedValue(new AdminApiError(400, "Không lưu được."));
    const onPartialFailure = vi.fn();
    render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={onPartialFailure} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không lưu được.");
    expect(shownOrder()).toEqual(["Bài 1", "Bài 2", "Bài 3"]);
    expect(puts()).toHaveLength(1);
    expect(onPartialFailure).not.toHaveBeenCalledWith(expect.objectContaining({ detail: expect.any(String) }));
  });

  it("reports a partial failure with the detail when the first PUT worked and the second failed", async () => {
    adminFetch.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận."));
    const onPartialFailure = vi.fn();
    render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={onPartialFailure} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    await waitFor(() => expect(onPartialFailure).toHaveBeenCalledWith(expect.objectContaining({ detail: "Máy chủ đang bận." })));
    expect(puts()).toHaveLength(2);
    // The list is out of date until the parent loads it again, so nothing can move.
    expect(screen.getByRole("button", { name: "Đưa bài Bài 3 lên" })).toBeDisabled();
  });

  it("clears an old partial-failure report when a new move starts", async () => {
    const onPartialFailure = vi.fn();
    render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={onPartialFailure} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    await waitFor(() => expect(onPartialFailure).toHaveBeenCalledWith(null));
  });

  it("signs in again on a session-expired error and writes the same orders", async () => {
    adminFetch.mockRejectedValueOnce(new AdminApiError(401, "Phiên đã hết hạn.", "session-expired"));
    requireReLogin.mockResolvedValue(undefined);
    render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 3 lên" }));
    await waitFor(() => expect(puts()).toHaveLength(3));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(puts()[1][1].body).toEqual(puts()[0][1].body);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(shownOrder()).toEqual(["Bài 1", "Bài 3", "Bài 2"]);
  });

  it("ignores a second move while the first is still being saved", async () => {
    let finish: () => void = () => {};
    adminFetch.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    expect(screen.getByRole("button", { name: "Đưa bài Bài 3 lên" })).toBeDisabled();
    finish();
    await waitFor(() => expect(screen.getByRole("button", { name: "Đưa bài Bài 3 lên" })).toBeEnabled());
    expect(puts()).toHaveLength(2);
  });

  it("disables up on the first mention and down on the last", () => {
    render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Đưa bài Bài 1 lên" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đưa bài Bài 3 xuống" })).toBeDisabled();
  });

  it("disables every move control while the parent reloads the list", () => {
    render(<PressList items={ITEMS} refreshing onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Đưa bài Bài 2 lên" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đưa bài Bài 2 xuống" })).toBeDisabled();
  });

  it("clears an old reorder error when a new list arrives", async () => {
    adminFetch.mockRejectedValue(new AdminApiError(400, "Không lưu được."));
    const { rerender } = render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    rerender(<PressList items={[...ITEMS, mention(4)]} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("lets moves work again when a new list arrives after a partial failure", async () => {
    adminFetch.mockResolvedValueOnce(undefined).mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận."));
    const { rerender } = render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Đưa bài Bài 3 lên" })).toBeDisabled());
    rerender(<PressList items={[mention(2, 10), mention(1, 20), mention(3, 30)]} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Đưa bài Bài 3 lên" })).toBeEnabled();
    expect(shownOrder()).toEqual(["Bài 2", "Bài 1", "Bài 3"]);
  });

  async function failAfterReload() {
    let fail: (e: Error) => void = () => {};
    // A first move works (two PUTs), so the list shows an order of the user's own. The second move fails late.
    adminFetch
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined)
      .mockReturnValueOnce(new Promise<void>((_, reject) => (fail = reject)));
    const view = render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Đưa bài Bài 3 lên" })).toBeEnabled());
    expect(shownOrder()).toEqual(["Bài 2", "Bài 1", "Bài 3"]);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 3 lên" }));
    view.rerender(<PressList items={[mention(4), mention(5)]} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    fail(new AdminApiError(400, "Lỗi."));
    await waitFor(() => expect(screen.getByRole("button", { name: "Đưa bài Bài 5 lên" })).toBeEnabled());
  }

  it("does not roll back to the old order when the failing save finishes after a reload", async () => {
    await failAfterReload();
    expect(shownOrder()).toEqual(["Bài 4", "Bài 5"]);
  });

  it("shows no error for a list that was replaced while the save ran", async () => {
    await failAfterReload();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("does not open a row while a reorder is being saved", async () => {
    adminFetch.mockReturnValue(new Promise<void>(() => {}));
    render(<PressList items={ITEMS} onSelect={vi.fn()} onPartialFailure={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Đưa bài Bài 1 xuống" }));
    expect(screen.getByRole("button", { name: /^Bài 1/ })).toBeDisabled();
  });
});

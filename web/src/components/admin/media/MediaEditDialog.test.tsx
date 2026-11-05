import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { MediaAdminDto } from "@/lib/admin/types";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
const stableReLogin = vi.fn();
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin: stableReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { MediaEditDialog } from "./MediaEditDialog";

const item: MediaAdminDto = { id: 4, url: "/media/4.webp", width: 10, height: 10, mime: "image/webp", altVi: "Gạo", altEn: "Rice" };

beforeEach(() => {
  adminFetch.mockReset();
});

describe("MediaEditDialog", () => {
  it("opens without the cursor in a box, so the description is not selected and the keyboard stays closed", async () => {
    render(<MediaEditDialog media={item} onClose={() => {}} onChanged={() => {}} onDeleted={() => {}} />);
    const dialog = await screen.findByRole("dialog");
    await waitFor(() => expect(dialog).toHaveFocus());
    const box = screen.getByLabelText(/Tiếng Việt/) as HTMLInputElement;
    expect(box).not.toHaveFocus();
    expect(box.value).toBe("Gạo");
  });

  it("saves trimmed alt texts with PUT and reports the result", async () => {
    const saved = { ...item, altVi: "Gạo nếp", altEn: "Sticky rice" };
    adminFetch.mockResolvedValue(saved);
    const onChanged = vi.fn();
    const events = userEvent.setup();
    render(<MediaEditDialog media={item} onClose={() => {}} onChanged={onChanged} onDeleted={() => {}} />);
    const vi_ = screen.getByLabelText(/Tiếng Việt/);
    await events.clear(vi_);
    await events.type(vi_, " Gạo nếp ");
    const en = screen.getByLabelText(/English/);
    await events.clear(en);
    await events.type(en, "Sticky rice");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(saved));
    expect(adminFetch).toHaveBeenCalledWith("/admin/media/4", { method: "PUT", body: { altVi: "Gạo nếp", altEn: "Sticky rice" } });
  });

  it("blocks Save when a description is empty", async () => {
    const events = userEvent.setup();
    render(<MediaEditDialog media={item} onClose={() => {}} onChanged={() => {}} onDeleted={() => {}} />);
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
    await events.clear(screen.getByLabelText(/English/));
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
  });

  it("deletes after the confirmation", async () => {
    adminFetch.mockResolvedValue(undefined);
    const onDeleted = vi.fn();
    const events = userEvent.setup();
    render(<MediaEditDialog media={item} onClose={() => {}} onChanged={() => {}} onDeleted={onDeleted} />);
    await events.click(screen.getByRole("button", { name: "Xóa ảnh" }));
    expect(adminFetch).not.toHaveBeenCalled();
    await events.click(await screen.findByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(4));
    expect(adminFetch).toHaveBeenCalledWith("/admin/media/4", { method: "DELETE" });
  });

  it("shows the detail of a 409 and keeps the image", async () => {
    adminFetch.mockRejectedValue(new AdminApiError(409, "Ảnh đang được dùng."));
    const onDeleted = vi.fn();
    const events = userEvent.setup();
    render(<MediaEditDialog media={item} onClose={() => {}} onChanged={() => {}} onDeleted={onDeleted} />);
    await events.click(screen.getByRole("button", { name: "Xóa ảnh" }));
    await events.click(await screen.findByRole("button", { name: "Xóa" }));
    expect(await screen.findByText("Ảnh đang được dùng.")).toBeInTheDocument();
    expect(onDeleted).not.toHaveBeenCalled();
  });
});

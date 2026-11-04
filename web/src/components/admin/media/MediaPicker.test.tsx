import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaAdminDto } from "@/lib/admin/types";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
const stableReLogin = vi.fn();
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin: stableReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { MediaPicker } from "./MediaPicker";

function media(id: number): MediaAdminDto {
  return { id, url: `/media/${id}.webp`, width: 10, height: 10, mime: "image/webp", altVi: `Ảnh ${id}`, altEn: `Image ${id}` };
}

const page = (from: number, count: number) => Array.from({ length: count }, (_, i) => media(from - i));

beforeEach(() => {
  adminFetch.mockReset();
});

async function open(events: ReturnType<typeof userEvent.setup>) {
  await events.click(screen.getByRole("button", { name: "Chọn ảnh" }));
  return screen.findByRole("dialog");
}

describe("MediaPicker", () => {
  it("replaces the value with one id in single mode and closes", async () => {
    adminFetch.mockResolvedValue(page(3, 3));
    const onChange = vi.fn();
    const events = userEvent.setup();
    render(<MediaPicker mode="single" value={[7]} onChange={onChange} />);
    const dialog = await open(events);
    await events.click(await within(dialog).findByAltText("Ảnh 2"));
    expect(onChange).toHaveBeenCalledWith([2]);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("toggles ids in multiple mode and keeps the box open", async () => {
    adminFetch.mockResolvedValue(page(3, 3));
    const onChange = vi.fn();
    const events = userEvent.setup();
    const { rerender } = render(<MediaPicker mode="multiple" value={[1]} onChange={onChange} />);
    const dialog = await open(events);
    await events.click(await within(dialog).findByAltText("Ảnh 3"));
    expect(onChange).toHaveBeenLastCalledWith([1, 3]);
    rerender(<MediaPicker mode="multiple" value={[1, 3]} onChange={onChange} />);
    await events.click(within(screen.getByRole("dialog")).getByAltText("Ảnh 1"));
    expect(onChange).toHaveBeenLastCalledWith([3]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("loads 50 images a page and shows More only while a page is full", async () => {
    adminFetch.mockResolvedValueOnce(page(100, 50)).mockResolvedValueOnce(page(50, 10));
    const events = userEvent.setup();
    render(<MediaPicker mode="single" value={[]} onChange={() => {}} />);
    const dialog = await open(events);
    await within(dialog).findByAltText("Ảnh 100");
    expect(adminFetch).toHaveBeenCalledWith("/admin/media?page=0");
    await events.click(within(dialog).getByRole("button", { name: "Xem thêm" }));
    await within(dialog).findByAltText("Ảnh 41");
    expect(adminFetch).toHaveBeenCalledWith("/admin/media?page=1");
    expect(within(dialog).queryByRole("button", { name: "Xem thêm" })).not.toBeInTheDocument();
  });

  it("has a tab to upload a new image", async () => {
    adminFetch.mockResolvedValue([]);
    const events = userEvent.setup();
    render(<MediaPicker mode="single" value={[]} onChange={() => {}} />);
    const dialog = await open(events);
    await events.click(within(dialog).getByRole("tab", { name: "Tải ảnh mới" }));
    expect(within(dialog).getByLabelText("Chọn ảnh")).toBeInTheDocument();
  });
});

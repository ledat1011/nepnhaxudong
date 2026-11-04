import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaAdminDto } from "@/lib/admin/types";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
const { uploadWithProgress } = vi.hoisted(() => ({ uploadWithProgress: vi.fn() }));
vi.mock("@/lib/admin/upload-progress", () => ({ uploadWithProgress }));
vi.mock("./shrink-image", () => ({ shrinkImage: async (file: File) => ({ file, shrunk: false }) }));
const stableReLogin = vi.fn();
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin: stableReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { MediaPicker } from "./MediaPicker";

function media(id: number): MediaAdminDto {
  return {
    id,
    url: `/media/${id}.webp`,
    width: 10,
    height: 10,
    mime: "image/webp",
    altVi: `Ảnh ${id}`,
    altEn: `Image ${id}`,
  };
}

const page = (from: number, count: number) => Array.from({ length: count }, (_, i) => media(from - i));

beforeEach(() => {
  adminFetch.mockReset();
  uploadWithProgress.mockReset();
  Object.assign(URL, { createObjectURL: vi.fn(() => "blob:preview"), revokeObjectURL: vi.fn() });
});

const jpeg = (name: string) => new File(["x"], name, { type: "image/jpeg" });

async function describePhoto(events: ReturnType<typeof userEvent.setup>, dialog: HTMLElement, n: number) {
  const photo = within(dialog).getByRole("group", { name: new RegExp(`^Ảnh ${n}\\b`) });
  await events.type(within(photo).getByLabelText(/Tiếng Việt/), `Ảnh mới ${n}`);
  await events.type(within(photo).getByLabelText(/English/), `New ${n}`);
  return photo;
}

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

  it("refuses a new image at max, says so, and still lets a chosen image be removed", async () => {
    adminFetch.mockResolvedValue(page(3, 3));
    const onChange = vi.fn();
    const events = userEvent.setup();
    render(<MediaPicker mode="multiple" value={[1, 2]} onChange={onChange} max={2} />);
    const dialog = await open(events);
    expect(within(dialog).getByText("Tối đa 2 ảnh")).toBeInTheDocument();
    await events.click(await within(dialog).findByAltText("Ảnh 3"));
    expect(onChange).not.toHaveBeenCalled();
    await events.click(within(dialog).getByAltText("Ảnh 1"));
    expect(onChange).toHaveBeenCalledWith([2]);
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

  it("has a tab to upload a new image, one photo at a time in single mode", async () => {
    adminFetch.mockResolvedValue(page(3, 3));
    const events = userEvent.setup();
    render(<MediaPicker mode="single" value={[]} onChange={() => {}} />);
    const dialog = await open(events);
    await within(dialog).findByAltText("Ảnh 3");
    await events.click(within(dialog).getByRole("tab", { name: "Tải ảnh mới" }));
    expect((within(dialog).getByLabelText("Chụp hoặc chọn ảnh") as HTMLInputElement).multiple).toBe(false);
  });

  it("opens the upload tab at once when the library is empty", async () => {
    adminFetch.mockResolvedValue([]);
    const events = userEvent.setup();
    render(<MediaPicker mode="multiple" value={[]} onChange={() => {}} />);
    const dialog = await open(events);
    await waitFor(() => expect(within(dialog).getByRole("tab", { name: "Tải ảnh mới" })).toHaveAttribute("aria-selected", "true"));
    expect((within(dialog).getByLabelText("Chụp hoặc chọn ảnh") as HTMLInputElement).multiple).toBe(true);
  });

  it("in single mode, uses the uploaded photo and closes", async () => {
    adminFetch.mockResolvedValue([]);
    uploadWithProgress.mockResolvedValue(media(12));
    const onChange = vi.fn();
    const events = userEvent.setup();
    render(<MediaPicker mode="single" value={[]} onChange={onChange} />);
    const dialog = await open(events);
    await events.upload(await within(dialog).findByLabelText("Chụp hoặc chọn ảnh"), jpeg("a.jpg"));
    const photo = await describePhoto(events, dialog, 1);
    await events.click(within(photo).getByRole("button", { name: "Tải lên" }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([12]));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("in multiple mode, adds every uploaded photo and goes back to the library", async () => {
    adminFetch.mockResolvedValue([]);
    uploadWithProgress.mockResolvedValueOnce(media(21)).mockResolvedValueOnce(media(22));
    const onChange = vi.fn();
    const events = userEvent.setup();
    render(<MediaPicker mode="multiple" value={[]} onChange={onChange} />);
    const dialog = await open(events);
    await events.upload(await within(dialog).findByLabelText("Chụp hoặc chọn ảnh"), [jpeg("a.jpg"), jpeg("b.jpg")]);
    await describePhoto(events, dialog, 1);
    await events.click(within(dialog).getByRole("button", { name: "Dùng mô tả này cho 1 ảnh chưa có mô tả" }));
    // The second photo is added to the first even when the parent has not rendered the new value yet.
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith([21, 22]));
    expect(onChange).toHaveBeenCalledWith([21]);
    await waitFor(() => expect(within(screen.getByRole("dialog")).getByRole("tab", { name: "Thư viện" })).toHaveAttribute("aria-selected", "true"));
  });

  it("asks before the box closes while a photo is not uploaded", async () => {
    adminFetch.mockResolvedValue([]);
    const events = userEvent.setup();
    render(<MediaPicker mode="multiple" value={[]} onChange={() => {}} />);
    const dialog = await open(events);
    await events.upload(await within(dialog).findByLabelText("Chụp hoặc chọn ảnh"), jpeg("a.jpg"));
    await events.click(within(dialog).getByRole("button", { name: "Xong" }));
    const ask = await screen.findByRole("alertdialog", { name: "Bỏ ảnh chưa tải lên?" });
    await events.click(within(ask).getByRole("button", { name: "Ở lại" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(within(screen.getByRole("dialog")).getByRole("group", { name: /^Ảnh 1/ })).toBeInTheDocument();

    await events.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Xong" }));
    await events.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Bỏ ảnh" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

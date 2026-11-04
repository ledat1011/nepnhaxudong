import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { MediaAdminDto } from "@/lib/admin/types";

const { adminUpload, requireReLogin } = vi.hoisted(() => ({ adminUpload: vi.fn(), requireReLogin: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminUpload, adminFetch: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { MediaUploader } from "./MediaUploader";

const created: MediaAdminDto = {
  id: 9,
  url: "/media/9.webp",
  width: 800,
  height: 600,
  mime: "image/webp",
  altVi: "Gạo",
  altEn: "Rice",
};

const createObjectURL = vi.fn(() => "blob:preview");
const revokeObjectURL = vi.fn();

beforeEach(() => {
  adminUpload.mockReset();
  requireReLogin.mockReset();
  createObjectURL.mockClear();
  revokeObjectURL.mockClear();
  Object.assign(URL, { createObjectURL, revokeObjectURL });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function jpeg(name = "gao.jpg"): File {
  return new File(["x"], name, { type: "image/jpeg" });
}

async function fill(events: ReturnType<typeof userEvent.setup>, en = "Rice") {
  await events.upload(screen.getByLabelText("Chọn ảnh"), jpeg());
  await events.type(screen.getByLabelText(/Tiếng Việt/), "Gạo");
  if (en) await events.type(screen.getByLabelText(/English/), en);
}

function asksBeforeUnload(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("MediaUploader", () => {
  it("asks before the page closes while a file or a description is waiting, and not after the upload", async () => {
    const events = userEvent.setup();
    adminUpload.mockResolvedValue(created);
    render(<MediaUploader onUploaded={() => {}} />);
    expect(asksBeforeUnload()).toBe(false);
    await events.type(screen.getByLabelText(/English/), "R");
    expect(asksBeforeUnload()).toBe(true);
    await events.clear(screen.getByLabelText(/English/));
    expect(asksBeforeUnload()).toBe(false);
    await events.upload(screen.getByLabelText("Chọn ảnh"), jpeg());
    expect(asksBeforeUnload()).toBe(true);
    await events.type(screen.getByLabelText(/Tiếng Việt/), "Gạo");
    await events.type(screen.getByLabelText(/English/), "Rice");
    await events.click(screen.getByRole("button", { name: "Tải lên" }));
    await waitFor(() => expect(asksBeforeUnload()).toBe(false));
  });

  it("accepts JPEG, PNG and WebP without forcing the camera", () => {
    render(<MediaUploader onUploaded={() => {}} />);
    const input = screen.getByLabelText("Chọn ảnh");
    expect(input).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    expect(input).not.toHaveAttribute("capture");
  });

  it("disables Upload until a file and both descriptions are given", async () => {
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    const button = screen.getByRole("button", { name: "Tải lên" });
    expect(button).toBeDisabled();
    await fill(events, "");
    expect(button).toBeDisabled();
    await events.type(screen.getByLabelText(/English/), "Rice");
    expect(button).toBeEnabled();
  });

  it("shows a preview and revokes it when the file changes and on unmount", async () => {
    const events = userEvent.setup();
    const { unmount } = render(<MediaUploader onUploaded={() => {}} />);
    await events.upload(screen.getByLabelText("Chọn ảnh"), jpeg("a.jpg"));
    expect(screen.getByAltText("Xem trước")).toHaveAttribute("src", "blob:preview");
    await events.upload(screen.getByLabelText("Chọn ảnh"), jpeg("b.jpg"));
    expect(revokeObjectURL).toHaveBeenCalledTimes(1);
    unmount();
    expect(revokeObjectURL).toHaveBeenCalledTimes(2);
  });

  it("checks the file in the browser and never sends a bad one", async () => {
    const events = userEvent.setup({ applyAccept: false });
    render(<MediaUploader onUploaded={() => {}} />);
    await events.upload(screen.getByLabelText("Chọn ảnh"), new File(["x"], "a.heic", { type: "" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG.");
    expect(screen.getByRole("button", { name: "Tải lên" })).toBeDisabled();
    expect(adminUpload).not.toHaveBeenCalled();
  });

  it("sends the file and trimmed descriptions, then reports the new image", async () => {
    adminUpload.mockResolvedValue(created);
    const onUploaded = vi.fn();
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={onUploaded} />);
    await events.upload(screen.getByLabelText("Chọn ảnh"), jpeg());
    await events.type(screen.getByLabelText(/Tiếng Việt/), "  Gạo ");
    await events.type(screen.getByLabelText(/English/), "Rice  ");
    await events.click(screen.getByRole("button", { name: "Tải lên" }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(created));
    const [path, form] = adminUpload.mock.calls[0] as [string, FormData];
    expect(path).toBe("/admin/media");
    expect((form.get("file") as File).name).toBe("gao.jpg");
    expect(form.get("altVi")).toBe("Gạo");
    expect(form.get("altEn")).toBe("Rice");
    expect(screen.getByLabelText(/Tiếng Việt/)).toHaveValue("");
  });

  it("keeps the file and descriptions after a 413 and shows the size message", async () => {
    adminUpload.mockRejectedValue(new AdminApiError(413, "Ảnh quá lớn. Tối đa 15 MB."));
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    await fill(events);
    await events.click(screen.getByRole("button", { name: "Tải lên" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Ảnh quá lớn. Tối đa 15 MB.");
    expect(screen.getByLabelText(/Tiếng Việt/)).toHaveValue("Gạo");
    expect(screen.getByLabelText(/English/)).toHaveValue("Rice");
    expect(screen.getByAltText("Xem trước")).toBeInTheDocument();
  });

  it("shows the detail of a 503 and offers a retry that sends again", async () => {
    adminUpload.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận. Hãy thử lại sau.")).mockResolvedValueOnce(created);
    const onUploaded = vi.fn();
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={onUploaded} />);
    await fill(events);
    await events.click(screen.getByRole("button", { name: "Tải lên" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Máy chủ đang bận. Hãy thử lại sau.");
    await events.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(created));
    expect(adminUpload).toHaveBeenCalledTimes(2);
  });

  it("keeps the form on a network failure", async () => {
    adminUpload.mockRejectedValue(new AdminApiError(0, "Không kết nối được máy chủ. Hãy kiểm tra mạng rồi thử lại."));
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    await fill(events);
    await events.click(screen.getByRole("button", { name: "Tải lên" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Không kết nối được máy chủ");
    expect(screen.getByLabelText(/English/)).toHaveValue("Rice");
  });

  it("clears the old error and the retry label when a new file is picked", async () => {
    adminUpload.mockRejectedValue(new AdminApiError(503, "Máy chủ đang bận. Hãy thử lại sau."));
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    await fill(events);
    await events.click(screen.getByRole("button", { name: "Tải lên" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await events.upload(screen.getByLabelText("Chọn ảnh"), jpeg("khac.jpg"));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tải lên" })).toBeInTheDocument();
  });

  it("gives each uploader its own file input id", () => {
    const { container } = render(
      <>
        <MediaUploader onUploaded={() => {}} />
        <MediaUploader onUploaded={() => {}} />
      </>,
    );
    const ids = Array.from(container.querySelectorAll("input[type=file]")).map((input) => input.id);
    expect(new Set(ids).size).toBe(2);
    expect(screen.getAllByLabelText("Chọn ảnh")).toHaveLength(2);
  });
});

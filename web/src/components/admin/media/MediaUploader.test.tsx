import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { MediaAdminDto } from "@/lib/admin/types";

const { uploadWithProgress, shrinkImage, requireReLogin, toastSuccess } = vi.hoisted(() => ({
  uploadWithProgress: vi.fn(),
  shrinkImage: vi.fn(),
  requireReLogin: vi.fn(),
  toastSuccess: vi.fn(),
}));
vi.mock("@/lib/admin/upload-progress", () => ({ uploadWithProgress }));
vi.mock("./shrink-image", () => ({ shrinkImage }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));

import { MediaUploader } from "./MediaUploader";

function media(id: number, altVi = "Gạo", altEn = "Rice"): MediaAdminDto {
  return { id, url: `/media/${id}.jpg`, width: 800, height: 600, mime: "image/jpeg", altVi, altEn };
}

function jpeg(name = "gao.jpg", bytes = 10): File {
  return new File([new Uint8Array(bytes)], name, { type: "image/jpeg" });
}

/** A call that waits until the test settles it. */
function deferred<T>() {
  let resolve: (value: T) => void = () => {};
  let reject: (reason: unknown) => void = () => {};
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

let urls = 0;
beforeEach(() => {
  uploadWithProgress.mockReset();
  shrinkImage.mockReset();
  shrinkImage.mockImplementation(async (file: File) => ({ file, shrunk: false, thumbnail: null }));
  requireReLogin.mockReset();
  toastSuccess.mockReset();
  urls = 0;
  Object.assign(URL, { createObjectURL: vi.fn(() => `blob:preview-${++urls}`), revokeObjectURL: vi.fn() });
});

afterEach(() => {
  vi.restoreAllMocks();
});

function picker() {
  return screen.getByLabelText("Chụp hoặc chọn ảnh") as HTMLInputElement;
}

function item(n: number) {
  return screen.getByRole("group", { name: new RegExp(`^Ảnh ${n}\\b`) });
}

async function describeItem(events: ReturnType<typeof userEvent.setup>, n: number, vi = "Gạo", en = "Rice") {
  const box = item(n);
  if (vi) await events.type(within(box).getByLabelText(/Tiếng Việt/), vi);
  if (en) await events.type(within(box).getByLabelText(/English/), en);
}

function sentForm(call: number): FormData {
  return uploadWithProgress.mock.calls[call][1] as FormData;
}

function asksBeforeUnload(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("MediaUploader", () => {
  it("has one big button for the camera or the gallery: any image type, no capture, many files only in a library", () => {
    const { unmount } = render(<MediaUploader multiple onUploaded={() => {}} />);
    expect(screen.getByRole("button", { name: "Chụp hoặc chọn ảnh" })).toBeInTheDocument();
    expect(picker()).toHaveAttribute("accept", "image/*");
    expect(picker()).not.toHaveAttribute("capture");
    expect(picker().multiple).toBe(true);
    expect(screen.getByText(/cần mô tả tiếng Việt và tiếng Anh/)).toBeInTheDocument();
    unmount();
    render(<MediaUploader onUploaded={() => {}} />);
    expect(picker().multiple).toBe(false);
  });

  it("lists every chosen photo with its own description boxes and says which text is still needed", async () => {
    const events = userEvent.setup();
    render(<MediaUploader multiple onUploaded={() => {}} />);
    await events.upload(picker(), [jpeg("a.jpg"), jpeg("b.jpg"), jpeg("c.jpg")]);
    expect(await screen.findAllByRole("group", { name: /^Ảnh \d/ })).toHaveLength(3);
    expect(within(item(1)).getByText("Cần mô tả tiếng Việt và tiếng Anh để tải lên.")).toBeInTheDocument();
    await events.type(within(item(1)).getByLabelText(/Tiếng Việt/), "Gạo");
    expect(within(item(1)).getByText("Cần mô tả tiếng Anh để tải lên.")).toBeInTheDocument();
    expect(uploadWithProgress).not.toHaveBeenCalled();
  });

  it("shrinks the photo, then sends the smaller file with both texts when the user leaves the filled item", async () => {
    const small = new File([new Uint8Array(3)], "a.jpg", { type: "image/jpeg" });
    shrinkImage.mockResolvedValue({ file: small, shrunk: true, thumbnail: new Blob(["t"], { type: "image/jpeg" }) });
    uploadWithProgress.mockResolvedValue(media(1));
    const onUploaded = vi.fn();
    const events = userEvent.setup();
    render(
      <>
        <MediaUploader multiple onUploaded={onUploaded} />
        <button type="button">Ở ngoài</button>
      </>,
    );
    const original = jpeg("a.jpg", 5000);
    await events.upload(picker(), original);
    await describeItem(events, 1, "  Gạo  ", "Rice");
    expect(uploadWithProgress).not.toHaveBeenCalled();
    await events.click(screen.getByRole("button", { name: "Ở ngoài" }));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(media(1)));
    expect(shrinkImage).toHaveBeenCalledWith(original);
    expect(uploadWithProgress.mock.calls[0][0]).toBe("/admin/media");
    expect(sentForm(0).get("file")).toBe(small);
    expect(sentForm(0).get("altVi")).toBe("Gạo");
    expect(sentForm(0).get("altEn")).toBe("Rice");
  });

  it("also sends with the Tải lên button of the item", async () => {
    uploadWithProgress.mockResolvedValue(media(1));
    const onUploaded = vi.fn();
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={onUploaded} />);
    await events.upload(picker(), jpeg());
    await describeItem(events, 1);
    await events.click(within(item(1)).getByRole("button", { name: "Tải lên" }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
  });

  it("shows the progress of each photo and locks its boxes while it goes up", async () => {
    const call = deferred<MediaAdminDto>();
    uploadWithProgress.mockReturnValue(call.promise);
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    await events.upload(picker(), jpeg());
    await describeItem(events, 1);
    await events.click(within(item(1)).getByRole("button", { name: "Tải lên" }));
    await waitFor(() => expect(uploadWithProgress).toHaveBeenCalled());

    act(() => uploadWithProgress.mock.calls[0][2].onProgress(0.4));
    expect(within(item(1)).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "40");
    expect(within(item(1)).getByText("Đang tải lên 40%")).toBeInTheDocument();
    expect(within(item(1)).getByLabelText(/English/)).toBeDisabled();
    expect(within(item(1)).getByLabelText(/Tiếng Việt/)).toBeDisabled();
    await act(async () => call.resolve(media(1)));
  });

  it("keeps a failed photo with the reason, and Thử lại sends it again", async () => {
    uploadWithProgress.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang xử lý ảnh khác. Hãy thử lại sau."));
    uploadWithProgress.mockResolvedValueOnce(media(4));
    const onUploaded = vi.fn();
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={onUploaded} />);
    await events.upload(picker(), jpeg());
    await describeItem(events, 1);
    await events.click(within(item(1)).getByRole("button", { name: "Tải lên" }));
    expect(await within(item(1)).findByText("Máy chủ đang xử lý ảnh khác. Hãy thử lại sau.")).toBeInTheDocument();
    expect(within(item(1)).getByLabelText(/English/)).toHaveValue("Rice");

    await events.click(within(item(1)).getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(media(4)));
    expect(uploadWithProgress).toHaveBeenCalledTimes(2);
  });

  it("removes a failed photo with Bỏ ảnh này", async () => {
    uploadWithProgress.mockRejectedValue(new AdminApiError(0, "Không kết nối được máy chủ."));
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    await events.upload(picker(), jpeg());
    await describeItem(events, 1);
    await events.click(within(item(1)).getByRole("button", { name: "Tải lên" }));
    await within(item(1)).findByText("Không kết nối được máy chủ.");
    await events.click(within(item(1)).getByRole("button", { name: "Bỏ ảnh này" }));
    expect(screen.queryByRole("group", { name: /^Ảnh 1/ })).not.toBeInTheDocument();
    expect(asksBeforeUnload()).toBe(false);
  });

  it("adds an iPhone tip when the API refuses a HEIC photo", async () => {
    uploadWithProgress.mockRejectedValue(new AdminApiError(415, "Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG."));
    // The browser would hide these files from the picker; the test sends them anyway.
    const events = userEvent.setup({ applyAccept: false });
    render(<MediaUploader onUploaded={() => {}} />);
    await events.upload(picker(), new File(["x"], "IMG_1.HEIC", { type: "" }));
    await describeItem(events, 1);
    await events.click(within(item(1)).getByRole("button", { name: "Tải lên" }));
    expect(await within(item(1)).findByText("Ảnh HEIC chưa được hỗ trợ. Hãy chọn ảnh JPEG hoặc PNG.")).toBeInTheDocument();
    expect(within(item(1)).getByText(/Tương thích nhất/)).toBeInTheDocument();
  });

  it("does not send a file that is not an image, and offers only to remove it", async () => {
    // The browser would hide these files from the picker; the test sends them anyway.
    const events = userEvent.setup({ applyAccept: false });
    render(<MediaUploader multiple onUploaded={() => {}} />);
    await events.upload(picker(), new File(["x"], "ghi-chu.pdf", { type: "application/pdf" }));
    expect(await within(item(1)).findByText("Tệp này không phải là ảnh.")).toBeInTheDocument();
    expect(within(item(1)).queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
    expect(within(item(1)).queryByLabelText(/English/)).not.toBeInTheDocument();
    expect(within(item(1)).getByRole("button", { name: "Bỏ ảnh này" })).toBeInTheDocument();
  });

  it("refuses a photo that is still over 15 MB after shrinking", async () => {
    const big = new File(["x"], "to.png", { type: "image/png" });
    Object.defineProperty(big, "size", { value: 16 * 1024 * 1024 });
    shrinkImage.mockResolvedValue({ file: big, shrunk: false, thumbnail: null });
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    await events.upload(picker(), big);
    expect(await within(item(1)).findByText("Ảnh quá lớn. Tối đa 15 MB.")).toBeInTheDocument();
    expect(uploadWithProgress).not.toHaveBeenCalled();
  });

  it("copies one description to the photos without one, then sends them one at a time", async () => {
    const first = deferred<MediaAdminDto>();
    uploadWithProgress.mockReturnValueOnce(first.promise).mockResolvedValueOnce(media(2)).mockResolvedValueOnce(media(3));
    const onUploaded = vi.fn();
    const onAllDone = vi.fn();
    const events = userEvent.setup();
    render(<MediaUploader multiple onUploaded={onUploaded} onAllDone={onAllDone} />);
    await events.upload(picker(), [jpeg("a.jpg"), jpeg("b.jpg"), jpeg("c.jpg")]);
    await screen.findAllByRole("group", { name: /^Ảnh \d/ });
    await describeItem(events, 1, "Ruộng lúa", "Rice field");
    await events.click(within(item(1)).getByRole("button", { name: "Dùng mô tả này cho 2 ảnh chưa có mô tả" }));

    expect(within(item(2)).getByLabelText(/English/)).toHaveValue("Rice field");
    await waitFor(() => expect(uploadWithProgress).toHaveBeenCalledTimes(1));
    // The second photo waits until the first one is done.
    expect(within(item(2)).getByText("Đang chờ tải lên…")).toBeInTheDocument();
    await act(async () => first.resolve(media(1)));

    await waitFor(() => expect(onAllDone).toHaveBeenCalledWith(3));
    expect(onUploaded.mock.calls.map(([m]) => (m as MediaAdminDto).id)).toEqual([1, 2, 3]);
    expect(sentForm(2).get("altVi")).toBe("Ruộng lúa");
    expect(toastSuccess).toHaveBeenCalledWith("Đã tải lên 3 ảnh.");
  });

  it("asks before the page closes while a photo is not uploaded, and not after", async () => {
    uploadWithProgress.mockResolvedValue(media(1));
    const onPendingChange = vi.fn();
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} onPendingChange={onPendingChange} />);
    expect(asksBeforeUnload()).toBe(false);
    await events.upload(picker(), jpeg());
    expect(asksBeforeUnload()).toBe(true);
    expect(onPendingChange).toHaveBeenLastCalledWith(true);
    await describeItem(events, 1);
    await events.click(within(item(1)).getByRole("button", { name: "Tải lên" }));
    await waitFor(() => expect(asksBeforeUnload()).toBe(false));
    expect(onPendingChange).toHaveBeenLastCalledWith(false);
    expect(toastSuccess).toHaveBeenCalledWith("Đã tải ảnh lên.");
  });

  it("in single mode, a new choice replaces the photo that waits for its text", async () => {
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    await events.upload(picker(), jpeg("a.jpg"));
    await describeItem(events, 1, "Cũ", "");
    await events.upload(picker(), jpeg("b.jpg"));
    await waitFor(() => expect(within(item(1)).getByLabelText(/Tiếng Việt/)).toHaveValue(""));
    expect(screen.getAllByRole("group", { name: /^Ảnh \d/ })).toHaveLength(1);
  });

  it("sends again after the user signs in, when the session had expired", async () => {
    uploadWithProgress
      .mockRejectedValueOnce(new AdminApiError(401, "Phiên đăng nhập đã hết hạn.", "session-expired"))
      .mockResolvedValueOnce(media(7));
    requireReLogin.mockResolvedValue(undefined);
    const onUploaded = vi.fn();
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={onUploaded} />);
    await events.upload(picker(), jpeg());
    await describeItem(events, 1);
    await events.click(within(item(1)).getByRole("button", { name: "Tải lên" }));
    await waitFor(() => expect(onUploaded).toHaveBeenCalledWith(media(7)));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
  });

  /** A tap on an iPhone: the button gets no focus, so the box loses focus to nothing, then the click comes. */
  function iphoneTap(button: HTMLElement, from: HTMLElement) {
    fireEvent.pointerDown(button);
    fireEvent.blur(from, { relatedTarget: null });
    fireEvent.click(button);
  }

  it("does not start an upload when an iPhone tap on Bỏ ảnh này takes the focus out of the boxes", async () => {
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    await events.upload(picker(), jpeg());
    await describeItem(events, 1);
    const english = within(item(1)).getByLabelText(/English/);
    iphoneTap(within(item(1)).getByRole("button", { name: "Bỏ ảnh này" }), english);
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(uploadWithProgress).not.toHaveBeenCalled();
    expect(screen.queryByRole("group", { name: /^Ảnh 1\b/ })).not.toBeInTheDocument();
  });

  it("starts the upload a moment after the boxes lose focus to nothing (a tap on an empty spot)", async () => {
    uploadWithProgress.mockResolvedValue(media(1));
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    await events.upload(picker(), jpeg());
    await describeItem(events, 1);
    fireEvent.blur(within(item(1)).getByLabelText(/English/), { relatedTarget: null });
    expect(uploadWithProgress).not.toHaveBeenCalled();
    await waitFor(() => expect(uploadWithProgress).toHaveBeenCalledTimes(1));
  });

  it("copies a description only to photos with no text at all, and leaves a half-written one alone", async () => {
    uploadWithProgress.mockResolvedValue(media(1));
    const events = userEvent.setup();
    render(<MediaUploader multiple onUploaded={() => {}} />);
    await events.upload(picker(), [jpeg("a.jpg"), jpeg("b.jpg"), jpeg("c.jpg")]);
    await screen.findAllByRole("group", { name: /^Ảnh \d/ });
    await describeItem(events, 2, "Chỉ tiếng Việt", "");
    await describeItem(events, 1, "Ruộng", "Field");
    const copy = within(item(1)).getByRole("button", { name: "Dùng mô tả này cho 1 ảnh chưa có mô tả" });
    iphoneTap(copy, within(item(1)).getByLabelText(/English/));

    await waitFor(() => expect(uploadWithProgress).toHaveBeenCalledTimes(2));
    const sentEnglish = uploadWithProgress.mock.calls.map(([, form]) => (form as FormData).get("altEn"));
    expect(sentEnglish).toEqual(["Field", "Field"]);
    expect(within(item(2)).getByLabelText(/English/)).toHaveValue("");
    expect(within(item(2)).getByText("Cần mô tả tiếng Anh để tải lên.")).toBeInTheDocument();
  });

  it("stops a running upload with Dừng, and keeps the photo to try again", async () => {
    uploadWithProgress.mockImplementation(
      (_path: string, _form: FormData, options: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener("abort", () => reject(new DOMException("stopped", "AbortError"))),
        ),
    );
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    await events.upload(picker(), jpeg());
    await describeItem(events, 1);
    await events.click(within(item(1)).getByRole("button", { name: "Tải lên" }));
    await events.click(await within(item(1)).findByRole("button", { name: "Dừng" }));
    expect(await within(item(1)).findByText("Đã dừng tải ảnh này.")).toBeInTheDocument();
    expect(within(item(1)).getByRole("button", { name: "Thử lại" })).toBeInTheDocument();
    expect(uploadWithProgress.mock.calls[0][2].signal.aborted).toBe(true);
  });

  it("stops the request when a photo that is going up is removed", async () => {
    uploadWithProgress.mockReturnValue(new Promise(() => {}));
    const onUploaded = vi.fn();
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={onUploaded} />);
    await events.upload(picker(), jpeg());
    await describeItem(events, 1);
    await events.click(within(item(1)).getByRole("button", { name: "Tải lên" }));
    await waitFor(() => expect(uploadWithProgress).toHaveBeenCalled());
    await events.click(within(item(1)).getByRole("button", { name: "Bỏ ảnh này" }));
    expect(uploadWithProgress.mock.calls[0][2].signal.aborted).toBe(true);
    expect(screen.queryByRole("group", { name: /^Ảnh 1\b/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says which photo is going up, and moves the focus to that photo when its boxes lock", async () => {
    uploadWithProgress.mockReturnValue(new Promise(() => {}));
    const events = userEvent.setup();
    render(<MediaUploader multiple onUploaded={() => {}} />);
    await events.upload(picker(), [jpeg("a.jpg"), jpeg("b.jpg")]);
    await screen.findAllByRole("group", { name: /^Ảnh \d/ });
    await describeItem(events, 2);
    await events.click(within(item(2)).getByRole("button", { name: "Tải lên" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Đang tải Ảnh 2"));
    expect(document.activeElement).toBe(item(2));
  });

  it("toasts the photos that went up when the others failed, and finishes when the last failed one is removed", async () => {
    uploadWithProgress.mockRejectedValueOnce(new AdminApiError(503, "Máy chủ đang bận.")).mockResolvedValueOnce(media(2));
    const onAllDone = vi.fn();
    const events = userEvent.setup();
    render(<MediaUploader multiple onUploaded={() => {}} onAllDone={onAllDone} />);
    await events.upload(picker(), [jpeg("a.jpg"), jpeg("b.jpg")]);
    await screen.findAllByRole("group", { name: /^Ảnh \d/ });
    await describeItem(events, 1, "Gạo", "Rice");
    await events.click(within(item(1)).getByRole("button", { name: "Dùng mô tả này cho 1 ảnh chưa có mô tả" }));

    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Đã tải ảnh lên."));
    expect(within(item(1)).getByText("Máy chủ đang bận.")).toBeInTheDocument();
    expect(onAllDone).not.toHaveBeenCalled();
    await events.click(within(item(1)).getByRole("button", { name: "Bỏ ảnh này" }));
    expect(onAllDone).toHaveBeenCalledWith(1);
    expect(toastSuccess).toHaveBeenCalledTimes(1);
  });

  it("makes the photos smaller one at a time", async () => {
    type Shrunk = { file: File; shrunk: boolean; thumbnail: Blob | null };
    const calls: ReturnType<typeof deferred<Shrunk>>[] = [];
    shrinkImage.mockImplementation(() => {
      const call = deferred<Shrunk>();
      calls.push(call);
      return call.promise;
    });
    const events = userEvent.setup();
    render(<MediaUploader multiple onUploaded={() => {}} />);
    const files = [jpeg("a.jpg"), jpeg("b.jpg"), jpeg("c.jpg")];
    await events.upload(picker(), files);
    await waitFor(() => expect(shrinkImage).toHaveBeenCalledTimes(1));
    await act(async () => calls[0].resolve({ file: files[0], shrunk: false, thumbnail: new Blob(["t"]) }));
    await waitFor(() => expect(shrinkImage).toHaveBeenCalledTimes(2));
    expect(shrinkImage).toHaveBeenLastCalledWith(files[1]);
    expect(within(item(1)).getByAltText("Xem trước ảnh 1")).toHaveAttribute("src", expect.stringMatching(/^blob:/));
    expect(within(item(2)).getByText("Đang thu nhỏ ảnh…")).toBeInTheDocument();
    await act(async () => calls[1].resolve({ file: files[1], shrunk: false, thumbnail: null }));
    await waitFor(() => expect(shrinkImage).toHaveBeenCalledTimes(3));
  });

  it("does not offer Thử lại when the server refuses the size (413)", async () => {
    uploadWithProgress.mockRejectedValue(new AdminApiError(413, "Ảnh quá lớn. Tối đa 15 MB."));
    const events = userEvent.setup();
    render(<MediaUploader onUploaded={() => {}} />);
    await events.upload(picker(), jpeg());
    await describeItem(events, 1);
    await events.click(within(item(1)).getByRole("button", { name: "Tải lên" }));
    expect(await within(item(1)).findByText("Ảnh quá lớn. Tối đa 15 MB.")).toBeInTheDocument();
    expect(within(item(1)).queryByRole("button", { name: "Thử lại" })).not.toBeInTheDocument();
    expect(within(item(1)).getByRole("button", { name: "Bỏ ảnh này" })).toBeInTheDocument();
  });
});

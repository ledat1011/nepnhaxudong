import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { PressMentionAdminDto, PressPreviewDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ requireReLogin }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { PressForm } from "./PressForm";

const FULL_PREVIEW: PressPreviewDto = { title: "Làng nghề bánh tráng", publishedOn: "2024-05-01", sourceName: "Báo Tuổi Trẻ" };
const EMPTY_PREVIEW: PressPreviewDto = { title: null, publishedOn: null, sourceName: null };
const NOTHING_READ = "Không đọc được thông tin từ trang này. Hãy tự nhập.";

function existing(): PressMentionAdminDto {
  return {
    id: 7,
    url: "https://baochi.example/bai-1",
    sourceName: "Báo A",
    publishedOn: "2023-01-02",
    title: { vi: "Bài một", en: "Article one" },
    mediaId: null,
    sortOrder: 3,
    missingEn: false,
  };
}

function writes() {
  return adminFetch.mock.calls.filter(([, init]) => ["PUT", "POST", "DELETE"].includes(init?.method));
}

function previews() {
  return adminFetch.mock.calls.filter(([path]) => path === "/admin/press/preview");
}

function urlBox() {
  return screen.getByLabelText(/^Đường dẫn bài báo/);
}
function sourceBox() {
  return screen.getByLabelText(/^Tên báo/);
}
function dateBox() {
  return screen.getByLabelText(/^Ngày đăng/);
}
function titleViBox() {
  return screen.getAllByLabelText(/Tiếng Việt/)[0];
}

/** Makes the preview answer with `answer`, and every write answer with a stored mention. */
function previewAnswers(answer: PressPreviewDto | Error) {
  adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path.startsWith("/admin/media")) return [];
    if (path === "/admin/press/preview") {
      if (answer instanceof Error) throw answer;
      return answer;
    }
    if (init?.method === "POST" || init?.method === "PUT") return existing();
    return undefined;
  });
}

/** Makes every preview wait; the returned list holds one resolver per preview call, in order. */
function slowPreviews(): Array<(value: PressPreviewDto) => void> {
  const resolvers: Array<(value: PressPreviewDto) => void> = [];
  adminFetch.mockImplementation((path: string) => {
    if (path.startsWith("/admin/media")) return Promise.resolve([]);
    return new Promise<PressPreviewDto>((resolve) => resolvers.push(resolve));
  });
  return resolvers;
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  previewAnswers(EMPTY_PREVIEW);
  scrollIntoView.mockReset();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

describe("PressForm preview", () => {
  it("fills the three empty boxes when a link is pasted", async () => {
    previewAnswers(FULL_PREVIEW);
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.click(urlBox());
    await user.paste("https://tuoitre.example/bai");
    await waitFor(() => expect(titleViBox()).toHaveValue("Làng nghề bánh tráng"));
    expect(sourceBox()).toHaveValue("Báo Tuổi Trẻ");
    expect(dateBox()).toHaveValue("2024-05-01");
    expect(previews()).toEqual([["/admin/press/preview", { method: "POST", body: { url: "https://tuoitre.example/bai" } }]]);
  });

  it("fills the boxes when Lấy thông tin is pressed", async () => {
    previewAnswers(FULL_PREVIEW);
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(urlBox(), "https://tuoitre.example/bai");
    expect(previews()).toHaveLength(0);
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    await waitFor(() => expect(sourceBox()).toHaveValue("Báo Tuổi Trẻ"));
  });

  it("does not overwrite text that is already in a box", async () => {
    previewAnswers(FULL_PREVIEW);
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(titleViBox(), "Tiêu đề của tôi");
    await user.type(sourceBox(), "Báo của tôi");
    await user.type(urlBox(), "https://tuoitre.example/bai");
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    await waitFor(() => expect(dateBox()).toHaveValue("2024-05-01"));
    expect(titleViBox()).toHaveValue("Tiêu đề của tôi");
    expect(sourceBox()).toHaveValue("Báo của tôi");
  });

  it("asks the user to type when the preview has nothing", async () => {
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.click(urlBox());
    await user.paste("https://tuoitre.example/bai");
    expect(await screen.findByText(NOTHING_READ)).toBeInTheDocument();
    expect(titleViBox()).toHaveValue("");
  });

  it("shows the detail of a 400 for ftp://x", async () => {
    previewAnswers(new AdminApiError(400, "Đường dẫn bài báo phải bắt đầu bằng http:// hoặc https://."));
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(urlBox(), "ftp://x");
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Đường dẫn bài báo phải bắt đầu bằng http:// hoặc https://.");
  });

  it("does not overwrite what the user typed while a slow preview was pending", async () => {
    const answers = slowPreviews();
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.click(urlBox());
    await user.paste("https://tuoitre.example/bai");
    await waitFor(() => expect(answers).toHaveLength(1));
    await user.type(titleViBox(), "Gõ trong lúc chờ");
    await act(async () => answers[0](FULL_PREVIEW));
    await waitFor(() => expect(sourceBox()).toHaveValue("Báo Tuổi Trẻ"));
    expect(titleViBox()).toHaveValue("Gõ trong lúc chờ");
  });

  it("ignores a preview answer for a link that was replaced while it was pending", async () => {
    const answers = slowPreviews();
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(urlBox(), "https://a.example/1");
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    await user.clear(urlBox());
    await user.type(urlBox(), "https://b.example/2");
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    await waitFor(() => expect(answers).toHaveLength(2));
    // The answer for the first link comes last and must be dropped.
    await act(async () => answers[1]({ title: "Bài B", publishedOn: null, sourceName: null }));
    await act(async () => answers[0]({ title: "Bài A", publishedOn: "2020-01-01", sourceName: "Báo A" }));
    expect(titleViBox()).toHaveValue("Bài B");
    expect(sourceBox()).toHaveValue("");
    expect(dateBox()).toHaveValue("");
  });

  it("ignores an older answer for the same link that arrives after a newer one", async () => {
    const answers = slowPreviews();
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(urlBox(), "https://a.example/1");
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    await waitFor(() => expect(answers).toHaveLength(2));
    await act(async () => answers[1](EMPTY_PREVIEW));
    await act(async () => answers[0](FULL_PREVIEW));
    expect(titleViBox()).toHaveValue("");
    expect(screen.getByText(NOTHING_READ)).toBeInTheDocument();
  });

  it("ignores a preview answer after the link was edited", async () => {
    const answers = slowPreviews();
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(urlBox(), "https://a.example/1");
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    await user.type(urlBox(), "2");
    await act(async () => answers[0](FULL_PREVIEW));
    expect(titleViBox()).toHaveValue("");
    expect(screen.queryByText(NOTHING_READ)).not.toBeInTheDocument();
  });

  it("does not show an old message once a new preview starts", async () => {
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(urlBox(), "https://a.example/1");
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    expect(await screen.findByText(NOTHING_READ)).toBeInTheDocument();
    const answers = slowPreviews();
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    await waitFor(() => expect(answers).toHaveLength(1));
    expect(screen.queryByText(NOTHING_READ)).not.toBeInTheDocument();
  });

  it("clears the old preview message as soon as the link is edited", async () => {
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(urlBox(), "https://a.example/1");
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    expect(await screen.findByText(NOTHING_READ)).toBeInTheDocument();
    await user.type(urlBox(), "2");
    expect(screen.queryByText(NOTHING_READ)).not.toBeInTheDocument();
  });

  it("clears an old preview error as soon as the link is edited", async () => {
    previewAnswers(new AdminApiError(400, "Đường dẫn không hợp lệ."));
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(urlBox(), "ftp://x");
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await user.type(urlBox(), "y");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("signs in again on session-expired and asks the preview once more", async () => {
    requireReLogin.mockResolvedValue(undefined);
    let first = true;
    adminFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/media")) return [];
      if (first) {
        first = false;
        throw new AdminApiError(401, "Phiên đã hết hạn.", "session-expired");
      }
      return FULL_PREVIEW;
    });
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(urlBox(), "https://tuoitre.example/bai");
    await user.click(screen.getByRole("button", { name: "Lấy thông tin" }));
    await waitFor(() => expect(sourceBox()).toHaveValue("Báo Tuổi Trẻ"));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(previews()).toHaveLength(2);
    expect(previews()[1]).toEqual(previews()[0]);
  });

  it("keeps Lấy thông tin disabled while the link is empty", () => {
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Lấy thông tin" })).toBeDisabled();
  });
});

describe("PressForm original link", () => {
  it("opens an http link in a new tab without leaking the opener", () => {
    render(<PressForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    const link = screen.getByRole("link", { name: "Mở bài gốc" });
    expect(link).toHaveAttribute("href", "https://baochi.example/bai-1");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it.each(["ftp://x", "javascript:alert(1)", "not a link", ""])("has no link for %j", async (value) => {
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    if (value !== "") await userEvent.type(urlBox(), value);
    expect(screen.queryByRole("link", { name: "Mở bài gốc" })).not.toBeInTheDocument();
  });
});

describe("PressForm saving", () => {
  it("shows under each empty required box what is missing, moves to the first one, and sends nothing", async () => {
    const user = userEvent.setup();
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.getByText("Ô có dấu * là ô phải điền.")).toBeInTheDocument();
    for (const box of [urlBox(), sourceBox(), titleViBox()]) expect(box).toBeRequired();
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(urlBox()).toHaveAccessibleDescription("Hãy nhập đường dẫn bài báo.");
    expect(sourceBox()).toHaveAccessibleDescription("Hãy nhập tên báo.");
    expect(titleViBox()).toHaveAccessibleDescription("Hãy nhập tiêu đề tiếng Việt.");
    await waitFor(() => expect(urlBox()).toHaveFocus());
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa lưu. Hãy sửa ô có viền đỏ.");
    expect(writes()).toHaveLength(0);

    await user.type(urlBox(), "https://x.example/a");
    await user.type(sourceBox(), "Báo X");
    await user.type(titleViBox(), "   ");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(titleViBox()).toHaveFocus());
    expect(writes()).toHaveLength(0);
    await user.type(titleViBox(), "Bài X");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
  });

  it("puts the API error about the link under the link box", async () => {
    const message = "Đường dẫn bài báo phải bắt đầu bằng http:// hoặc https:// và dài tối đa 2000 ký tự.";
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") throw new AdminApiError(400, message);
      return undefined;
    });
    const user = userEvent.setup();
    render(<PressForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.clear(urlBox());
    await user.type(urlBox(), "baochi.example/x");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(urlBox()).toHaveFocus());
    expect(urlBox()).toHaveAccessibleDescription(message);
    expect(screen.getAllByText(message)).toHaveLength(1);
  });

  it("creates with POST, trims text, sends null for blank boxes, and locks the form", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<PressForm onClose={vi.fn()} onChanged={onChanged} />);
    await user.type(urlBox(), "  https://x.example/a  ");
    await user.type(sourceBox(), " Báo X ");
    await user.type(titleViBox(), "  Bài X  ");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(writes()).toEqual([
      [
        "/admin/press",
        {
          method: "POST",
          body: {
            url: "https://x.example/a",
            sourceName: "Báo X",
            publishedOn: null,
            title: { vi: "Bài X", en: null },
            mediaId: null,
          },
        },
      ],
    ]);
    expect(screen.getByRole("button", { name: /Lưu/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lấy thông tin" })).toBeDisabled();
  });

  it("updates with PUT without a sort order, so the mention keeps its place", async () => {
    const user = userEvent.setup();
    render(<PressForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(screen.getAllByLabelText("English")[0], " 2");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0][0]).toBe("/admin/press/7");
    expect(writes()[0][1].method).toBe("PUT");
    expect(writes()[0][1].body).not.toHaveProperty("sortOrder");
    expect(writes()[0][1].body).toMatchObject({ publishedOn: "2023-01-02", title: { vi: "Bài một", en: "Article one 2" } });
  });

  it("disables every box while the save runs, so nothing typed is lost when the dialog closes", async () => {
    const user = userEvent.setup();
    let finish: (value: PressMentionAdminDto) => void = () => undefined;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") return new Promise<PressMentionAdminDto>((resolve) => (finish = resolve));
      return undefined;
    });
    render(<PressForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(screen.getAllByLabelText("English")[0], " 2");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    for (const box of [urlBox(), sourceBox(), dateBox(), titleViBox(), screen.getAllByLabelText("English")[0]]) {
      expect(box).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: "Chọn ảnh" })).toBeDisabled();
    await act(async () => finish(existing()));
  });

  it("deletes after confirmation and then locks the form", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    render(<PressForm initial={existing()} onClose={vi.fn()} onChanged={onChanged} />);
    await user.click(screen.getByRole("button", { name: "Xóa bài báo" }));
    await user.click(await screen.findByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledTimes(1));
    expect(writes()).toEqual([["/admin/press/7", { method: "DELETE" }]]);
    expect(screen.getByRole("button", { name: "Xóa bài báo" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
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
    render(<PressForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(screen.getAllByLabelText("English")[0], "?");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(writes()[1][1].body).toEqual(writes()[0][1].body);
    expect(writes()[0][1].body.title.en).toBe("Article one?");
  });

  it("shows the API detail when the save is refused, and keeps the text", async () => {
    const user = userEvent.setup();
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "POST") throw new AdminApiError(400, "Đường dẫn bài báo không hợp lệ.");
      return undefined;
    });
    render(<PressForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(urlBox(), "ftp://x");
    await user.type(sourceBox(), "Báo X");
    await user.type(titleViBox(), "Bài X");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    // The message names the link, so it sits under the link box.
    await waitFor(() => expect(urlBox()).toHaveAccessibleDescription("Đường dẫn bài báo không hợp lệ."));
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa lưu. Hãy sửa ô có viền đỏ.");
    expect(titleViBox()).toHaveValue("Bài X");
    expect(screen.getByRole("button", { name: "Lưu" })).toBeEnabled();
  });
});

describe("PressForm leaving", () => {
  it("closes at once when nothing changed", async () => {
    const onClose = vi.fn();
    render(<PressForm initial={existing()} onClose={onClose} onChanged={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  async function dirtyForm() {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<PressForm initial={existing()} onClose={onClose} onChanged={vi.fn()} />);
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
    await user.click(within(question).getByRole("button", { name: "Hủy" }));
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { name: "Sửa bài báo" })).toBeInTheDocument();
    expect(screen.getAllByLabelText("English")[0]).toHaveValue("Article one!");
  });
});

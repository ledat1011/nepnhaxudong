import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminApiError } from "@/lib/admin/errors";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaAdminDto, TimelineEventAdminDto } from "@/lib/admin/types";
import { invalidateMediaCache } from "@/lib/admin/use-media-by-ids";

const { adminFetch, requireReLogin, toast } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
  toast: Object.assign(vi.fn(), { success: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ requireReLogin }),
}));
vi.mock("sonner", () => ({ toast }));

import { TimelineEventForm } from "./TimelineEventForm";

function existing(overrides: Partial<TimelineEventAdminDto> = {}): TimelineEventAdminDto {
  return {
    id: 5,
    year: 2005,
    sortOrder: 2,
    title: { vi: "Thành lập", en: "Founded" },
    description: { vi: null, en: null },
    mediaIds: [],
    missingEn: false,
    ...overrides,
  };
}

function media(id: number): MediaAdminDto {
  return { id, url: `/media/${id}.webp`, width: 10, height: 10, mime: "image/webp", altVi: `Ảnh ${id}`, altEn: `Image ${id}` };
}

/** The aria-labels of the "Bỏ ảnh" buttons, in the order shown. */
function photoNames(): (string | null)[] {
  return screen.queryAllByRole("button", { name: /^Bỏ ảnh/ }).map((button) => button.getAttribute("aria-label"));
}

function writes() {
  return adminFetch.mock.calls.filter(([, init]) => ["PUT", "POST", "DELETE"].includes(init?.method));
}

const scrollIntoView = vi.fn();

afterEach(() => {
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

beforeEach(() => {
  scrollIntoView.mockReset();
  Element.prototype.scrollIntoView = scrollIntoView;
  adminFetch.mockReset();
  requireReLogin.mockReset();
  toast.mockReset();
  // The images found by id stay cached for the page load; each test starts with an empty cache.
  invalidateMediaCache();
  adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path.startsWith("/admin/media")) return [];
    if (init?.method === "POST" || init?.method === "PUT") return existing();
    return undefined;
  });
});

describe("TimelineEventForm photos", () => {
  beforeEach(() => {
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [media(1), media(2), media(3), media(4)];
      if (init?.method === "POST" || init?.method === "PUT") return existing();
      return undefined;
    });
  });

  it("adds up to 3 photos in the order they are picked, then locks Chọn ảnh and says why", async () => {
    const user = userEvent.setup();
    render(<TimelineEventForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Chọn ảnh" }));
    const picker = await screen.findByRole("dialog", { name: "Chọn ảnh" });
    await user.click(await within(picker).findByAltText("Ảnh 2"));
    await user.click(within(picker).getByAltText("Ảnh 1"));
    await user.click(within(picker).getByAltText("Ảnh 3"));
    expect(within(picker).getByText("Tối đa 3 ảnh")).toBeInTheDocument();
    await user.click(within(picker).getByAltText("Ảnh 4"));
    await user.click(within(picker).getByRole("button", { name: "Xong" }));

    await waitFor(() => expect(photoNames()).toEqual(["Bỏ ảnh Ảnh 2", "Bỏ ảnh Ảnh 1", "Bỏ ảnh Ảnh 3"]));
    const pick = screen.getByRole("button", { name: "Chọn ảnh" });
    expect(pick).toBeDisabled();
    expect(pick).toHaveAccessibleDescription("Một mốc có tối đa 3 ảnh.");
    expect(screen.getByText("Một mốc có tối đa 3 ảnh.")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0][1].body.mediaIds).toEqual([2, 1, 3]);
  });

  it("moves photos up and down and sends the new order", async () => {
    const user = userEvent.setup();
    render(<TimelineEventForm initial={existing({ mediaIds: [1, 2, 3] })} onClose={vi.fn()} onChanged={vi.fn()} />);
    await screen.findByAltText("Ảnh 3");
    expect(screen.getByRole("button", { name: "Đưa ảnh Ảnh 1 lên" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đưa ảnh Ảnh 3 xuống" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Đưa ảnh Ảnh 3 lên" }));
    await user.click(screen.getByRole("button", { name: "Đưa ảnh Ảnh 1 xuống" }));
    expect(photoNames()).toEqual(["Bỏ ảnh Ảnh 3", "Bỏ ảnh Ảnh 1", "Bỏ ảnh Ảnh 2"]);

    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toEqual([
      "/admin/timeline/5",
      {
        method: "PUT",
        body: { year: 2005, title: { vi: "Thành lập", en: "Founded" }, description: { vi: null, en: null }, mediaIds: [3, 1, 2] },
      },
    ]);
  });

  it("removes a photo with a Hoàn tác message and opens Chọn ảnh again", async () => {
    const user = userEvent.setup();
    render(<TimelineEventForm initial={existing({ mediaIds: [1, 2, 3] })} onClose={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Chọn ảnh" })).toBeDisabled();
    await user.click(await screen.findByRole("button", { name: "Bỏ ảnh Ảnh 2" }));
    expect(photoNames()).toEqual(["Bỏ ảnh Ảnh 1", "Bỏ ảnh Ảnh 3"]);
    expect(toast).toHaveBeenCalledWith(
      "Đã bỏ ảnh 2 khỏi mốc.",
      expect.objectContaining({ action: expect.objectContaining({ label: "Hoàn tác" }) }),
    );
    const pick = screen.getByRole("button", { name: "Chọn ảnh" });
    expect(pick).toBeEnabled();
    expect(pick).not.toHaveAccessibleDescription();
    expect(screen.queryByText("Một mốc có tối đa 3 ảnh.")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0][1].body.mediaIds).toEqual([1, 3]);
  });

  it.each(["Một mốc có tối đa 3 ảnh.", "Ảnh bị chọn hai lần: 2.", "Ảnh không tồn tại: 9."])(
    "shows the API photo error %s above the buttons",
    async (message) => {
      adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
        if (path.startsWith("/admin/media")) return [media(1), media(2)];
        if (init?.method === "PUT") throw new AdminApiError(400, message);
        return undefined;
      });
      const user = userEvent.setup();
      render(<TimelineEventForm initial={existing({ mediaIds: [1] })} onClose={vi.fn()} onChanged={vi.fn()} />);
      await user.type(screen.getAllByLabelText("English")[0], " 2");
      await user.click(screen.getByRole("button", { name: "Lưu" }));
      expect(await screen.findByRole("alert")).toHaveTextContent(message);
    },
  );
});

describe("TimelineEventForm", () => {
  it("reports a year of 1899 at once and does not call the API", async () => {
    const user = userEvent.setup();
    render(<TimelineEventForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    const year = screen.getByLabelText(/^Năm/);
    await user.clear(year);
    await user.type(year, "1899");
    expect(screen.getByText("Năm phải nằm trong khoảng 1900 đến 2100.")).toBeInTheDocument();
    expect(year).toHaveAccessibleDescription("Năm phải nằm trong khoảng 1900 đến 2100.");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(writes()).toHaveLength(0);
    expect(year).toHaveFocus();
  });

  it("shows what is missing under each box when Lưu is pressed on an empty form, and moves to the first one", async () => {
    const user = userEvent.setup();
    render(<TimelineEventForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    const year = screen.getByLabelText(/^Năm/);
    const titleVi = screen.getAllByLabelText(/Tiếng Việt/)[0];
    expect(year).toHaveAccessibleDescription("Hãy nhập năm.");
    expect(titleVi).toHaveAccessibleDescription("Hãy nhập tiêu đề tiếng Việt.");
    expect(titleVi).toHaveAttribute("aria-invalid", "true");
    await waitFor(() => expect(year).toHaveFocus());
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa lưu. Hãy sửa ô có viền đỏ.");
    expect(writes()).toHaveLength(0);

    await user.type(year, "2020");
    await user.type(titleVi, "Một mốc");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
  });

  it("marks Năm and the Vietnamese title with * and explains the *", () => {
    render(<TimelineEventForm onClose={vi.fn()} onChanged={vi.fn()} />);
    expect(screen.getByText("Ô có dấu * là ô phải điền.")).toBeInTheDocument();
    expect(screen.getByLabelText(/^Năm/)).toBeRequired();
    expect(screen.getByText(/^Năm/)).toHaveTextContent("Năm *");
    expect(screen.getAllByLabelText(/Tiếng Việt/)[0]).toBeRequired();
  });

  it("puts an API error under the box it names", async () => {
    const message = "Tiêu đề mốc (tiếng Anh) không được để trống khi đã có nội dung tiếng Anh.";
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") throw new AdminApiError(400, message);
      return undefined;
    });
    const user = userEvent.setup();
    render(<TimelineEventForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    const titleEn = screen.getAllByLabelText("English")[0];
    await user.clear(titleEn);
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(titleEn).toHaveFocus());
    expect(titleEn).toHaveAccessibleDescription(message);
    expect(screen.getAllByText(message)).toHaveLength(1);
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(titleEn);
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
            mediaIds: [],
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

  it("disables every box while the save runs, so nothing typed is lost when the dialog closes", async () => {
    const user = userEvent.setup();
    let finish: (value: TimelineEventAdminDto) => void = () => undefined;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") return new Promise<TimelineEventAdminDto>((resolve) => (finish = resolve));
      return undefined;
    });
    render(<TimelineEventForm initial={existing()} onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(screen.getAllByLabelText("English")[0], " 2");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(screen.getByLabelText(/^Năm/)).toBeDisabled();
    for (const box of [...screen.getAllByLabelText("Tiếng Việt"), ...screen.getAllByLabelText("English")]) {
      expect(box).toBeDisabled();
    }
    expect(screen.getByRole("button", { name: "Chọn ảnh" })).toBeDisabled();
    await act(async () => finish(existing()));
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

  it("refuses a whitespace-only Vietnamese title without calling the API", async () => {
    const user = userEvent.setup();
    render(<TimelineEventForm onClose={vi.fn()} onChanged={vi.fn()} />);
    await user.type(screen.getByLabelText(/^Năm/), "2020");
    await user.type(screen.getAllByLabelText(/Tiếng Việt/)[0], "   ");
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    expect(screen.getAllByLabelText(/Tiếng Việt/)[0]).toHaveAccessibleDescription("Hãy nhập tiêu đề tiếng Việt.");
    expect(writes()).toHaveLength(0);
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


  it("clears the English title error once the English description changes", async () => {
    const message = "Tiêu đề mốc (tiếng Anh) không được để trống khi đã có nội dung tiếng Anh.";
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") throw new AdminApiError(400, message);
      return undefined;
    });
    const user = userEvent.setup();
    render(
      <TimelineEventForm
        initial={{ ...existing(), description: { vi: "Mô tả", en: "Text" } }}
        onClose={vi.fn()}
        onChanged={vi.fn()}
      />,
    );
    const titleEn = screen.getAllByLabelText("English")[0];
    await user.clear(titleEn);
    await user.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(titleEn).toHaveAttribute("aria-invalid", "true"));
    await user.clear(screen.getAllByLabelText("English")[1]);
    expect(titleEn).not.toHaveAttribute("aria-invalid");
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

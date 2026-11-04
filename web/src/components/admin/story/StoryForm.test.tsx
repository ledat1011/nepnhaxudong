import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { MediaAdminDto, StoryAdminDto, StoryRequest } from "@/lib/admin/types";

const { adminFetch, requireReLogin, push, replace } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { StoryForm } from "./StoryForm";

function media(id: number): MediaAdminDto {
  return { id, url: `/media/${id}.webp`, width: 10, height: 10, mime: "image/webp", altVi: `Ảnh ${id}`, altEn: `Image ${id}` };
}

function story(overrides: Partial<StoryAdminDto> = {}): StoryAdminDto {
  return {
    id: 5,
    status: "DRAFT",
    publishedAt: null,
    coverMediaId: null,
    slug: { vi: "mua-gat", en: "harvest" },
    title: { vi: "Mùa gặt", en: "Harvest" },
    excerpt: { vi: "Tóm tắt", en: null },
    bodyHtml: { vi: "<p>Thân bài</p>", en: null },
    missingEn: true,
    ...overrides,
  };
}

/** What the API would answer for a write: the request, with a slug made up when it is blank. */
function answer(id: number, body: StoryRequest, extra: Partial<StoryAdminDto> = {}): StoryAdminDto {
  return {
    ...story(),
    id,
    coverMediaId: body.coverMediaId ?? null,
    slug: { vi: body.slug?.vi ?? "tu-dong", en: body.title.en === null ? null : (body.slug?.en ?? "tu-dong-en") },
    title: body.title,
    excerpt: body.excerpt ?? { vi: null, en: null },
    bodyHtml: body.bodyHtml ?? { vi: null, en: null },
    ...extra,
  };
}

type Call = [string, { method?: string; body?: unknown } | undefined];

function writes(): { path: string; method: string; body: StoryRequest }[] {
  return (adminFetch.mock.calls as Call[])
    .filter(
      ([path, init]) =>
        path.startsWith("/admin/stories") && (init?.method === "PUT" || init?.method === "POST") && init.body !== undefined,
    )
    .map(([path, init]) => ({ path, method: init?.method ?? "", body: init?.body as StoryRequest }));
}

function calls(path: string): Call[] {
  return (adminFetch.mock.calls as Call[]).filter(([p]) => p === path);
}

function sessionExpired() {
  return new AdminApiError(401, "Phiên đăng nhập đã hết hạn.", "session-expired");
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  requireReLogin.mockResolvedValue(undefined);
  push.mockReset();
  replace.mockReset();
  adminFetch.mockImplementation(async (path: string, init?: { method?: string; body?: StoryRequest }) => {
    if (path.startsWith("/admin/media")) return [media(1), media(2)];
    if (path === "/admin/stories" && init?.method === "POST") return answer(9, init.body as StoryRequest);
    if (path === "/admin/stories") return [];
    const put = /^\/admin\/stories\/(\d+)$/.exec(path);
    if (put !== null && init?.method === "PUT") return answer(Number(put[1]), init.body as StoryRequest);
    if (path.endsWith("/publish")) return story({ status: "PUBLISHED", publishedAt: "2026-11-04T01:00:00Z" });
    if (path.endsWith("/unpublish")) return story({ status: "DRAFT", publishedAt: "2026-11-04T01:00:00Z" });
    return undefined;
  });
});

async function ready() {
  // The first test of a run also loads the editor chunk, which can be slow on a busy machine.
  await screen.findByRole("textbox", { name: "Nội dung" }, { timeout: 10_000 });
}

describe("StoryForm slug", () => {
  it("does not change the slug of a saved story when its title changes", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    const title = screen.getByLabelText("Tiêu đề");
    await events.clear(title);
    await events.type(title, "Tên khác hoàn toàn");
    expect(screen.getByLabelText("Đường dẫn")).toHaveValue("mua-gat");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0].body.slug).toEqual({ vi: "mua-gat", en: "harvest" });
  });

  it("suggests a slug from the title while the slug box is empty", async () => {
    const events = userEvent.setup();
    render(<StoryForm />);
    await ready();
    await events.type(screen.getByLabelText("Tiêu đề"), "Đồng lúa đẹp");
    expect(screen.getByLabelText("Đường dẫn")).toHaveValue("dong-lua-dep");
    await events.click(screen.getByRole("tab", { name: "English" }));
    await events.type(screen.getByLabelText("Tiêu đề"), "Fine rice");
    expect(screen.getByLabelText("Đường dẫn")).toHaveValue("fine-rice");
  });

  it("stops suggesting once the user edits the slug by hand", async () => {
    const events = userEvent.setup();
    render(<StoryForm />);
    await ready();
    const title = screen.getByLabelText("Tiêu đề");
    await events.type(title, "Lúa");
    expect(screen.getByLabelText("Đường dẫn")).toHaveValue("lua");
    const slug = screen.getByLabelText("Đường dẫn");
    await events.clear(slug);
    await events.type(slug, "tu-chon");
    await events.type(title, " mới");
    expect(screen.getByLabelText("Đường dẫn")).toHaveValue("tu-chon");
  });
});

describe("StoryForm save", () => {
  it("sends the English fields as null when the English tab is empty, and trims the text", async () => {
    const events = userEvent.setup();
    render(<StoryForm />);
    await ready();
    await events.type(screen.getByLabelText("Tiêu đề"), "  Mùa gặt  ");
    await events.type(screen.getByLabelText("Tóm tắt"), "  Gặt lúa  ");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0].path).toBe("/admin/stories");
    expect(writes()[0].method).toBe("POST");
    expect(writes()[0].body).toEqual({
      coverMediaId: null,
      slug: { vi: "mua-gat", en: null },
      title: { vi: "Mùa gặt", en: null },
      excerpt: { vi: "Gặt lúa", en: null },
      bodyHtml: { vi: null, en: null },
    });
  });

  it("sends the chosen cover image", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    const cover = screen.getByRole("group", { name: "Ảnh bìa" });
    await events.click(within(cover).getByRole("button", { name: "Chọn ảnh" }));
    const dialog = await screen.findByRole("dialog");
    await events.click(await within(dialog).findByAltText("Ảnh 2"));
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0].body.coverMediaId).toBe(2);
  });

  it("locks the form after a create and goes to the edit page of the new story", async () => {
    const events = userEvent.setup();
    render(<StoryForm />);
    await ready();
    await events.type(screen.getByLabelText("Tiêu đề"), "Mùa gặt");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/cau-chuyen/9"));
    const save = screen.getByRole("button", { name: /Đang lưu|^Lưu$/ });
    expect(save).toBeDisabled();
    await events.click(save);
    expect(writes()).toHaveLength(1);
  });

  it("keeps what the user typed while a save was running", async () => {
    const events = userEvent.setup();
    let finish: (value: StoryAdminDto) => void = () => undefined;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string; body?: StoryRequest }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") return new Promise<StoryAdminDto>((resolve) => (finish = resolve));
      return undefined;
    });
    render(<StoryForm initial={story()} />);
    await ready();
    const title = screen.getByLabelText("Tiêu đề");
    await events.type(title, " A");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const sent = writes()[0].body;
    await events.type(title, "B");
    await act(async () => finish(answer(5, sent)));
    expect(screen.getByLabelText("Tiêu đề")).toHaveValue("Mùa gặt AB");
    // The text typed after the request left is still unsaved.
    expect(screen.getByRole("button", { name: "Lưu" })).toBeEnabled();
  });

  it("is clean after a save with no typing in between", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.type(screen.getByLabelText("Tiêu đề"), "!");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled());
    expect(screen.getByLabelText("Tiêu đề")).toHaveValue("Mùa gặt!");
  });
});

describe("StoryForm slug conflict", () => {
  function conflictWith(otherSlug: { vi: string | null; en: string | null }) {
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") throw new AdminApiError(409, "Đường dẫn bài viết đã tồn tại.");
      if (path === "/admin/stories") return [story({ id: 77, slug: otherSlug }), story({ id: 5 })];
      return undefined;
    });
  }

  it("shows the message under the slug box of the English tab and switches to that tab", async () => {
    const events = userEvent.setup();
    conflictWith({ vi: "khac", en: "trung" });
    render(<StoryForm initial={story()} />);
    await ready();
    await events.click(screen.getByRole("tab", { name: "English" }));
    const slug = screen.getByLabelText("Đường dẫn");
    await events.clear(slug);
    await events.type(slug, "trung");
    await events.click(screen.getByRole("tab", { name: "Tiếng Việt" }));
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "English" })).toHaveAttribute("aria-selected", "true"));
    expect(screen.getByLabelText("Đường dẫn")).toHaveAccessibleDescription("Đường dẫn bài viết đã tồn tại.");
    expect(screen.getAllByRole("alert")).toHaveLength(1);
  });

  it("names the taken language from the other stories when both slugs were changed", async () => {
    const events = userEvent.setup();
    conflictWith({ vi: "khac", en: "trung-en" });
    render(<StoryForm initial={story()} />);
    await ready();
    const viSlug = screen.getByLabelText("Đường dẫn");
    await events.clear(viSlug);
    await events.type(viSlug, "moi-vi");
    await events.click(screen.getByRole("tab", { name: "English" }));
    const enSlug = screen.getByLabelText("Đường dẫn");
    await events.clear(enSlug);
    await events.type(enSlug, "trung-en");
    await events.click(screen.getByRole("tab", { name: "Tiếng Việt" }));
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    // Both slugs changed, so only the list of other stories can tell that the English one is taken.
    await waitFor(() => expect(screen.getByRole("tab", { name: "English" })).toHaveAttribute("aria-selected", "true"));
    expect(screen.getByLabelText("Đường dẫn")).toHaveAccessibleDescription("Đường dẫn bài viết đã tồn tại.");
    await events.click(screen.getByRole("tab", { name: "Tiếng Việt" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows the message on the Vietnamese tab when the Vietnamese slug is the one taken", async () => {
    const events = userEvent.setup();
    conflictWith({ vi: "trung-vi", en: null });
    render(<StoryForm initial={story()} />);
    await ready();
    const slug = screen.getByLabelText("Đường dẫn");
    await events.clear(slug);
    await events.type(slug, "trung-vi");
    await events.click(screen.getByRole("tab", { name: "English" }));
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "Tiếng Việt" })).toHaveAttribute("aria-selected", "true"));
    expect(screen.getByLabelText("Đường dẫn")).toHaveAccessibleDescription("Đường dẫn bài viết đã tồn tại.");
  });

  it("falls back to the language whose slug was changed when the list cannot be read", async () => {
    const events = userEvent.setup();
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") throw new AdminApiError(409, "Đường dẫn bài viết đã tồn tại.");
      throw new AdminApiError(500, "Lỗi.");
    });
    render(<StoryForm initial={story()} />);
    await ready();
    await events.click(screen.getByRole("tab", { name: "English" }));
    const slug = screen.getByLabelText("Đường dẫn");
    await events.clear(slug);
    await events.type(slug, "moi");
    await events.click(screen.getByRole("tab", { name: "Tiếng Việt" }));
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "English" })).toHaveAttribute("aria-selected", "true"));
    expect(screen.getByLabelText("Đường dẫn")).toHaveAccessibleDescription("Đường dẫn bài viết đã tồn tại.");
  });

  it("removes the message when that slug is edited", async () => {
    const events = userEvent.setup();
    conflictWith({ vi: "mua-gat-2", en: null });
    render(<StoryForm initial={story()} />);
    await ready();
    const slug = screen.getByLabelText("Đường dẫn");
    await events.clear(slug);
    await events.type(slug, "mua-gat-2");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await screen.findByRole("alert");
    await events.type(screen.getByLabelText("Đường dẫn"), "x");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

const IMAGE_WARNING = "Có ảnh không hiển thị được trong trình soạn thảo và sẽ bị xóa nếu bạn lưu.";

describe("StoryForm untouched story", () => {
  it("stays clean after the editor is focused when the body ends with a heading", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story({ bodyHtml: { vi: "<p>a</p><h2>B</h2>", en: null } })} />);
    await ready();
    await events.click(screen.getByRole("textbox", { name: "Nội dung" }));
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Đăng bài" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Xem trước" })).toBeEnabled();
  });

  it("stays clean when the editor writes the body in another form", async () => {
    render(<StoryForm initial={story({ bodyHtml: { vi: "<ul><li>x</li></ul>", en: null } })} />);
    await ready();
    await waitFor(() => expect(screen.getByRole("button", { name: "Đăng bài" })).toBeEnabled());
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
  });

  it("saves the editor form of the body after a real edit", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story({ bodyHtml: { vi: "<ul><li>x</li></ul>", en: null } })} />);
    await ready();
    await events.type(screen.getByLabelText("Tiêu đề"), "!");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0].body.bodyHtml?.vi).toBe("<ul><li><p>x</p></li></ul>");
  });

  it("warns when the API body has an image the editor cannot show, and stays clean", async () => {
    render(
      <StoryForm initial={story({ bodyHtml: { vi: '<p>x</p><img src="https://e.example/a.png" alt="e">', en: null } })} />,
    );
    await ready();
    expect(await screen.findByText(IMAGE_WARNING)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
  });

  it("shows no warning for a body whose images are all from the library", async () => {
    render(<StoryForm initial={story({ bodyHtml: { vi: '<img src="/media/1.webp" alt="a">', en: null } })} />);
    await ready();
    expect(screen.queryByText(IMAGE_WARNING)).not.toBeInTheDocument();
  });

  it("makes the fields read-only while a new story is being created", async () => {
    const events = userEvent.setup();
    let finish: (value: StoryAdminDto) => void = () => undefined;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "POST") return new Promise<StoryAdminDto>((resolve) => (finish = resolve));
      return undefined;
    });
    render(<StoryForm />);
    await ready();
    await events.type(screen.getByLabelText("Tiêu đề"), "Mùa gặt");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(screen.getByLabelText("Tiêu đề")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Đường dẫn")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Tóm tắt")).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "Nội dung" })).toHaveAttribute("contenteditable", "false");
    expect(within(screen.getByRole("group", { name: "Ảnh bìa" })).getByRole("button", { name: "Chọn ảnh" })).toBeDisabled();
    await events.type(screen.getByLabelText("Tiêu đề"), "xyz");
    expect(screen.getByLabelText("Tiêu đề")).toHaveValue("Mùa gặt");
    await act(async () => finish(answer(9, writes()[0].body)));
    expect(replace).toHaveBeenCalledWith("/admin/cau-chuyen/9");
  });

  it("can be edited again after a failed create", async () => {
    const events = userEvent.setup();
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "POST") throw new AdminApiError(503, "Máy chủ đang bận.");
      return undefined;
    });
    render(<StoryForm />);
    await ready();
    await events.type(screen.getByLabelText("Tiêu đề"), "Mùa gặt");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await screen.findByText("Máy chủ đang bận.");
    expect(screen.getByLabelText("Tiêu đề")).not.toHaveAttribute("readonly");
  });
});

describe("StoryForm preview", () => {
  it("is locked for a new story and while there are unsaved changes", async () => {
    const events = userEvent.setup();
    const { unmount } = render(<StoryForm />);
    await ready();
    expect(screen.getByRole("button", { name: "Xem trước" })).toBeDisabled();
    unmount();

    render(<StoryForm initial={story()} />);
    await ready();
    expect(screen.getByRole("button", { name: "Xem trước" })).toBeEnabled();
    await events.type(screen.getByLabelText("Tiêu đề"), "!");
    expect(screen.getByRole("button", { name: "Xem trước" })).toBeDisabled();
    expect(screen.getByText("Hãy lưu trước khi xem trước.")).toBeInTheDocument();
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Xem trước" })).toBeEnabled());
  });

  it("shows the sanitized body that the API returned, not the editor's html", async () => {
    const events = userEvent.setup();
    adminFetch.mockImplementation(async (path: string, init?: { method?: string; body?: StoryRequest }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT")
        return answer(5, init.body as StoryRequest, { bodyHtml: { vi: "<p>Đã làm sạch</p>", en: "<p>Cleaned</p>" } });
      return undefined;
    });
    render(<StoryForm initial={story()} />);
    await ready();
    await events.type(screen.getByLabelText("Tiêu đề"), "!");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Xem trước" })).toBeEnabled());
    await events.click(screen.getByRole("button", { name: "Xem trước" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Đã làm sạch")).toBeInTheDocument();
    expect(within(dialog).getByText("Mùa gặt!")).toBeInTheDocument();
    await events.click(within(dialog).getByRole("tab", { name: "English" }));
    expect(within(dialog).getByText("Cleaned")).toBeInTheDocument();
  });
});

describe("StoryForm publish", () => {
  it("publishes a saved draft and then offers to unpublish", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    expect(screen.getByText("Nháp")).toBeInTheDocument();
    await events.click(screen.getByRole("button", { name: "Đăng bài" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Gỡ bài" })).toBeInTheDocument());
    expect(calls("/admin/stories/5/publish")).toHaveLength(1);
    expect(screen.getByText("Đã đăng")).toBeInTheDocument();
  });

  it("is blocked, with a message, while there are unsaved changes", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.type(screen.getByLabelText("Tiêu đề"), "!");
    expect(screen.getByRole("button", { name: "Đăng bài" })).toBeDisabled();
    expect(screen.getByText("Hãy lưu thay đổi trước khi đăng hoặc gỡ bài.")).toBeInTheDocument();
    await events.click(screen.getByRole("button", { name: "Đăng bài" }));
    expect(calls("/admin/stories/5/publish")).toHaveLength(0);
  });

  it("is not offered for a story that is not saved yet", async () => {
    render(<StoryForm />);
    await ready();
    expect(screen.queryByRole("button", { name: "Đăng bài" })).not.toBeInTheDocument();
    expect(screen.getByText("Hãy lưu bài trước khi đăng.")).toBeInTheDocument();
  });

  it("signs in again after a 401 and runs the same publish once more", async () => {
    const events = userEvent.setup();
    let attempts = 0;
    adminFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/media")) return [];
      if (path === "/admin/stories/5/publish") {
        attempts += 1;
        if (attempts === 1) throw sessionExpired();
        return story({ status: "PUBLISHED" });
      }
      return undefined;
    });
    render(<StoryForm initial={story()} />);
    await ready();
    await events.click(screen.getByRole("button", { name: "Đăng bài" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Gỡ bài" })).toBeInTheDocument());
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(attempts).toBe(2);
  });

  it("signs in again after a 401 and runs the same unpublish once more", async () => {
    const events = userEvent.setup();
    let attempts = 0;
    adminFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/media")) return [];
      if (path === "/admin/stories/5/unpublish") {
        attempts += 1;
        if (attempts === 1) throw sessionExpired();
        return story({ status: "DRAFT" });
      }
      return undefined;
    });
    render(<StoryForm initial={story({ status: "PUBLISHED", publishedAt: "2026-11-01T00:00:00Z" })} />);
    await ready();
    await events.click(screen.getByRole("button", { name: "Gỡ bài" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Đăng bài" })).toBeInTheDocument());
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(attempts).toBe(2);
  });

  it("shows the API message when publishing fails and keeps the status", async () => {
    const events = userEvent.setup();
    adminFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/media")) return [];
      if (path.endsWith("/publish")) throw new AdminApiError(503, "Máy chủ đang bận.");
      return undefined;
    });
    render(<StoryForm initial={story()} />);
    await ready();
    await events.click(screen.getByRole("button", { name: "Đăng bài" }));
    expect(await screen.findByText("Máy chủ đang bận.")).toBeInTheDocument();
    expect(screen.getByText("Nháp")).toBeInTheDocument();
  });

  it("locks the save bar while a publish runs and keeps text typed meanwhile", async () => {
    const events = userEvent.setup();
    let finish: (value: StoryAdminDto) => void = () => undefined;
    adminFetch.mockImplementation(async (path: string) => {
      if (path.startsWith("/admin/media")) return [];
      if (path.endsWith("/publish")) return new Promise<StoryAdminDto>((resolve) => (finish = resolve));
      return undefined;
    });
    render(<StoryForm initial={story()} />);
    await ready();
    await events.click(screen.getByRole("button", { name: "Đăng bài" }));
    await events.type(screen.getByLabelText("Tiêu đề"), "!");
    expect(screen.getByRole("button", { name: /Đang lưu|^Lưu$/ })).toBeDisabled();
    await act(async () => finish(story({ status: "PUBLISHED" })));
    expect(screen.getByLabelText("Tiêu đề")).toHaveValue("Mùa gặt!");
  });
});

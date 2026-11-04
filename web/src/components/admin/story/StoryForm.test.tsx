import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { MediaAdminDto, StoryAdminDto, StoryRequest } from "@/lib/admin/types";

const { adminFetch, requireReLogin, push, replace, session } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  // No user by default: the browser draft is off, so the other tests do not depend on it.
  session: { user: null as { id: number } | null },
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin, user: session.user }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { allowDraftWrites, draftKey } from "@/lib/admin/story-draft";
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

/** Answers the check panel that opens on "Đăng bài". The fixture story has gaps, so the button is "Vẫn đăng bài". */
async function confirmPublish(events: ReturnType<typeof userEvent.setup>) {
  const panel = await screen.findByRole("alertdialog", { name: "Kiểm tra trước khi đăng" });
  await events.click(within(panel).getByRole("button", { name: /đăng bài/i }));
}

async function confirmUnpublish(events: ReturnType<typeof userEvent.setup>) {
  const question = await screen.findByRole("alertdialog", { name: "Gỡ bài khỏi website?" });
  await events.click(within(question).getByRole("button", { name: "Gỡ bài" }));
}

/** The title box. Its label ends with " *" on the Vietnamese tab; the editor toolbar also has "Tiêu đề …" buttons. */
const TITLE_LABEL = /^Tiêu đề( \*)?$/;

async function ready() {
  // The first test of a run also loads the editor chunk, which can be slow on a busy machine.
  await screen.findByRole("textbox", { name: "Nội dung" }, { timeout: 10_000 });
}

describe("StoryForm slug", () => {
  it("does not change the slug of a saved story when its title changes", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    const title = screen.getByLabelText(TITLE_LABEL);
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
    await events.type(screen.getByLabelText(TITLE_LABEL), "Đồng lúa đẹp");
    expect(screen.getByLabelText("Đường dẫn")).toHaveValue("dong-lua-dep");
    await events.click(screen.getByRole("tab", { name: "English" }));
    await events.type(screen.getByLabelText(TITLE_LABEL), "Fine rice");
    expect(screen.getByLabelText("Đường dẫn")).toHaveValue("fine-rice");
  });

  it("stops suggesting once the user edits the slug by hand", async () => {
    const events = userEvent.setup();
    render(<StoryForm />);
    await ready();
    const title = screen.getByLabelText(TITLE_LABEL);
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
    await events.type(screen.getByLabelText(TITLE_LABEL), "  Mùa gặt  ");
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
    await events.type(screen.getByLabelText(TITLE_LABEL), "Mùa gặt");
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
    const title = screen.getByLabelText(TITLE_LABEL);
    await events.type(title, " A");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const sent = writes()[0].body;
    await events.type(title, "B");
    await act(async () => finish(answer(5, sent)));
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveValue("Mùa gặt AB");
    // The text typed after the request left is still unsaved.
    expect(screen.getByRole("button", { name: "Lưu" })).toBeEnabled();
  });

  it("is clean after a save with no typing in between", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled());
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveValue("Mùa gặt!");
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
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
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

  it("keeps an image the editor cannot show when only the title is changed", async () => {
    const events = userEvent.setup();
    const body = '<p>x</p><img src="https://e.example/a.png" alt="e">';
    render(<StoryForm initial={story({ bodyHtml: { vi: body, en: null } })} />);
    await ready();
    await screen.findByText(IMAGE_WARNING);
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0].body.bodyHtml?.vi).toBe(body);
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
    await events.type(screen.getByLabelText(TITLE_LABEL), "Mùa gặt");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Đường dẫn")).toHaveAttribute("readonly");
    expect(screen.getByLabelText("Tóm tắt")).toHaveAttribute("readonly");
    expect(screen.getByRole("textbox", { name: "Nội dung" })).toHaveAttribute("contenteditable", "false");
    expect(within(screen.getByRole("group", { name: "Ảnh bìa" })).getByRole("button", { name: "Chọn ảnh" })).toBeDisabled();
    await events.type(screen.getByLabelText(TITLE_LABEL), "xyz");
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveValue("Mùa gặt");
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
    await events.type(screen.getByLabelText(TITLE_LABEL), "Mùa gặt");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await screen.findByText("Máy chủ đang bận.");
    expect(screen.getByLabelText(TITLE_LABEL)).not.toHaveAttribute("readonly");
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
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
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
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
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
    await confirmPublish(events);
    await waitFor(() => expect(screen.getByRole("button", { name: "Gỡ bài" })).toBeInTheDocument());
    expect(calls("/admin/stories/5/publish")).toHaveLength(1);
    expect(screen.getByText("Đã đăng")).toBeInTheDocument();
  });

  it("is blocked, with a message, while there are unsaved changes", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
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
    await confirmPublish(events);
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
    await confirmUnpublish(events);
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
    await confirmPublish(events);
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
    await confirmPublish(events);
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
    expect(screen.getByRole("button", { name: /Đang lưu|^Lưu$/ })).toBeDisabled();
    await act(async () => finish(story({ status: "PUBLISHED" })));
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveValue("Mùa gặt!");
  });
});

describe("StoryForm check before publishing", () => {
  it("lists what is missing and publishes only after Vẫn đăng bài", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.click(screen.getByRole("button", { name: "Đăng bài" }));
    const panel = await screen.findByRole("alertdialog", { name: "Kiểm tra trước khi đăng" });
    expect(within(panel).getByText("Có tiêu đề")).toBeInTheDocument();
    expect(within(panel).getByText("Chưa có ảnh bìa")).toBeInTheDocument();
    expect(within(panel).getByText("Có tóm tắt")).toBeInTheDocument();
    expect(within(panel).getByText("Bản tiếng Anh còn thiếu: tóm tắt, nội dung")).toBeInTheDocument();
    expect(calls("/admin/stories/5/publish")).toHaveLength(0);
    await events.click(within(panel).getByRole("button", { name: "Vẫn đăng bài" }));
    await waitFor(() => expect(calls("/admin/stories/5/publish")).toHaveLength(1));
  });

  it("offers a plain Đăng bài when nothing is missing", async () => {
    const events = userEvent.setup();
    render(
      <StoryForm
        initial={story({
          coverMediaId: 1,
          excerpt: { vi: "Tóm tắt", en: "Summary" },
          bodyHtml: { vi: "<p>Thân bài</p>", en: "<p>Body</p>" },
          missingEn: false,
        })}
      />,
    );
    await ready();
    await events.click(screen.getByRole("button", { name: "Đăng bài" }));
    const panel = await screen.findByRole("alertdialog", { name: "Kiểm tra trước khi đăng" });
    expect(within(panel).queryByText(/^Chưa có/)).not.toBeInTheDocument();
    expect(within(panel).queryByRole("button", { name: "Vẫn đăng bài" })).not.toBeInTheDocument();
    await events.click(within(panel).getByRole("button", { name: "Đăng bài" }));
    await waitFor(() => expect(calls("/admin/stories/5/publish")).toHaveLength(1));
  });

  it("does not publish on Quay lại sửa and moves to the first missing part", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.click(screen.getByRole("button", { name: "Đăng bài" }));
    const panel = await screen.findByRole("alertdialog", { name: "Kiểm tra trước khi đăng" });
    await events.click(within(panel).getByRole("button", { name: "Quay lại sửa" }));
    expect(panel).not.toBeInTheDocument();
    // The first gap is the cover image, so the cursor goes to its button.
    await waitFor(() => expect(screen.getByRole("button", { name: "Chọn ảnh" })).toHaveFocus());
    expect(calls("/admin/stories/5/publish")).toHaveLength(0);
  });

  it("opens the English tab on Quay lại sửa when only the English version is missing", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story({ coverMediaId: 1, title: { vi: "Mùa gặt", en: null }, slug: { vi: "mua-gat", en: null } })} />);
    await ready();
    await events.click(screen.getByRole("button", { name: "Đăng bài" }));
    const panel = await screen.findByRole("alertdialog", { name: "Kiểm tra trước khi đăng" });
    expect(within(panel).getByText("Chưa có bản tiếng Anh")).toBeInTheDocument();
    await events.click(within(panel).getByRole("button", { name: "Quay lại sửa" }));
    expect(screen.getByRole("tab", { name: "English" })).toHaveAttribute("aria-selected", "true");
    await waitFor(() => expect(screen.getByLabelText(TITLE_LABEL)).toHaveFocus());
  });
});

describe("StoryForm unpublish question", () => {
  it("asks before Gỡ bài, and Không gỡ keeps the story on the website", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story({ status: "PUBLISHED", publishedAt: "2026-11-01T00:00:00Z" })} />);
    await ready();
    await events.click(screen.getByRole("button", { name: "Gỡ bài" }));
    const question = await screen.findByRole("alertdialog", { name: "Gỡ bài khỏi website?" });
    await events.click(within(question).getByRole("button", { name: "Không gỡ" }));
    expect(calls("/admin/stories/5/unpublish")).toHaveLength(0);
    expect(screen.getByText("Đã đăng")).toBeInTheDocument();

    await events.click(screen.getByRole("button", { name: "Gỡ bài" }));
    await confirmUnpublish(events);
    await waitFor(() => expect(calls("/admin/stories/5/unpublish")).toHaveLength(1));
  });
});

describe("StoryForm field errors", () => {
  const scrollIntoView = vi.fn();
  beforeEach(() => {
    scrollIntoView.mockReset();
    Element.prototype.scrollIntoView = scrollIntoView;
  });
  afterEach(() => {
    delete (Element.prototype as Partial<Element>).scrollIntoView;
  });

  it("marks the Vietnamese title with * and asks for it before it calls the API", async () => {
    const events = userEvent.setup();
    render(<StoryForm />);
    await ready();
    expect(screen.getByText("Ô có dấu * là ô phải điền.")).toBeInTheDocument();
    const title = screen.getByLabelText(TITLE_LABEL);
    expect(title).toBeRequired();
    await events.type(screen.getByLabelText("Tóm tắt"), "Chỉ có tóm tắt");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    expect(title).toHaveAccessibleDescription("Tiêu đề bài viết (tiếng Việt) không được để trống.");
    await waitFor(() => expect(title).toHaveFocus());
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa lưu. Hãy sửa ô có viền đỏ.");
    expect(writes()).toHaveLength(0);
  });

  it("opens the English tab for an API error about the English title and moves there", async () => {
    const message = "Tiêu đề bài viết (tiếng Anh) không được để trống khi đã có nội dung tiếng Anh.";
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") throw new AdminApiError(400, message);
      return undefined;
    });
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.getByRole("tab", { name: "English" })).toHaveAttribute("aria-selected", "true"));
    const titleEn = screen.getByLabelText(TITLE_LABEL);
    await waitFor(() => expect(titleEn).toHaveFocus());
    expect(titleEn).toHaveAccessibleDescription(message);
  });
});

describe("StoryForm English title error", () => {
  it("goes away once the English text it asks about is deleted", async () => {
    const message = "Tiêu đề bài viết (tiếng Anh) không được để trống khi đã có nội dung tiếng Anh.";
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") throw new AdminApiError(400, message);
      return undefined;
    });
    const events = userEvent.setup();
    render(<StoryForm initial={story({ excerpt: { vi: "Tóm tắt", en: "Summary" } })} />);
    await ready();
    await events.click(screen.getByRole("tab", { name: "English" }));
    await events.clear(screen.getByLabelText(TITLE_LABEL));
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(screen.getByLabelText(TITLE_LABEL)).toHaveAttribute("aria-invalid", "true"));
    await events.clear(screen.getByLabelText("Tóm tắt"));
    expect(screen.getByLabelText(TITLE_LABEL)).not.toHaveAttribute("aria-invalid");
  });
});

describe("StoryForm draft in the browser", () => {
  // 18:20 on 4 November 2026 in Viet Nam.
  const SAVED_AT = Date.UTC(2026, 10, 4, 11, 20);

  function formState(source: StoryAdminDto) {
    const lang = (code: "vi" | "en") => ({
      title: source.title[code] ?? "",
      slug: source.slug[code] ?? "",
      excerpt: source.excerpt[code] ?? "",
      bodyHtml: source.bodyHtml[code] ?? "",
    });
    return { coverMediaId: source.coverMediaId, vi: lang("vi"), en: lang("en") };
  }

  function putDraft(key: string, state: ReturnType<typeof formState>, extra: { userId?: number; base?: ReturnType<typeof formState> } = {}) {
    localStorage.setItem(
      key,
      JSON.stringify({ version: 1, userId: extra.userId ?? 1, savedAt: SAVED_AT, base: extra.base ?? formState(story()), state }),
    );
  }

  function stored(key: string) {
    const raw = localStorage.getItem(key);
    return raw === null ? null : JSON.parse(raw);
  }

  const edited = () => {
    const state = formState(story());
    state.vi.title = "Mùa gặt (viết dở)";
    return state;
  };

  /** While the question is open, the page behind it is hidden from the accessibility tree. */
  async function readyBehindQuestion() {
    await screen.findByRole("textbox", { name: "Nội dung", hidden: true }, { timeout: 10_000 });
  }

  beforeEach(() => {
    localStorage.clear();
    allowDraftWrites();
    session.user = { id: 1 };
  });

  afterEach(() => {
    session.user = null;
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("keeps the typed text in the browser a moment after typing", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
    await waitFor(() => expect(stored(draftKey(1, 5))?.state.vi.title).toBe("Mùa gặt!"), { timeout: 3000 });
    expect(stored(draftKey(1, 5)).userId).toBe(1);
  });

  it("asks when the editor opens with an unsaved draft, and Khôi phục puts every part back as unsaved", async () => {
    const body = '<p>Có <a href="https://lua.example/mua-gat">một liên kết</a> ở đây.</p><img src="/media/2.webp" alt="Ảnh 2">';
    const kept = edited();
    kept.coverMediaId = 1;
    kept.vi.excerpt = "Tóm tắt viết dở";
    kept.vi.bodyHtml = body;
    kept.en.excerpt = "Unfinished summary";
    putDraft(draftKey(1, 5), kept);
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await readyBehindQuestion();
    const question = await screen.findByRole("alertdialog", { name: "Có bài đang viết dở" });
    expect(question).toHaveTextContent("lúc 18:20 ngày 4/11");
    expect(question).not.toHaveTextContent("Bài đã được lưu lại sau lúc đó");
    await events.click(within(question).getByRole("button", { name: "Khôi phục" }));

    expect(screen.getByLabelText(TITLE_LABEL)).toHaveValue("Mùa gặt (viết dở)");
    expect(screen.getByLabelText("Tóm tắt")).toHaveValue("Tóm tắt viết dở");
    const editor = screen.getByRole("textbox", { name: "Nội dung" });
    await waitFor(() => expect(editor.querySelector('a[href="https://lua.example/mua-gat"]')).not.toBeNull());
    expect(editor).toHaveTextContent("Có một liên kết ở đây.");
    expect(editor.querySelector('img[src="/media/2.webp"]')).not.toBeNull();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeEnabled();

    // What is saved is the restored story: cover, both languages, the link and the image.
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const sent = writes()[0].body;
    expect(sent.coverMediaId).toBe(1);
    expect(sent.title.vi).toBe("Mùa gặt (viết dở)");
    expect(sent.excerpt).toEqual({ vi: "Tóm tắt viết dở", en: "Unfinished summary" });
    expect(sent.bodyHtml?.vi).toContain('<a href="https://lua.example/mua-gat">một liên kết</a>');
    expect(sent.bodyHtml?.vi).toContain('<img src="/media/2.webp" alt="Ảnh 2">');
  });

  it("does not say the story was saved again when only the editor rewrote the body", async () => {
    // The editor writes this list in its own form when it opens; the draft holds the API form as its base.
    const listStory = story({ bodyHtml: { vi: "<ul><li>x</li></ul>", en: null } });
    const kept = formState(listStory);
    kept.vi.title = "Mùa gặt (viết dở)";
    putDraft(draftKey(1, 5), kept, { base: formState(listStory) });
    render(<StoryForm initial={listStory} />);
    await readyBehindQuestion();
    const question = await screen.findByRole("alertdialog", { name: "Có bài đang viết dở" });
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(question).not.toHaveTextContent("Bài đã được lưu lại sau lúc đó");
  });

  it("never removes or offers the draft of another family member on the same phone", async () => {
    putDraft(draftKey(2, 5), edited(), { userId: 2 });
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
    await waitFor(() => expect(stored(draftKey(1, 5))).not.toBeNull(), { timeout: 3000 });
    await events.clear(screen.getByLabelText(TITLE_LABEL));
    await events.type(screen.getByLabelText(TITLE_LABEL), "Mùa gặt");
    await waitFor(() => expect(stored(draftKey(1, 5))).toBeNull());
    expect(stored(draftKey(2, 5)).state.vi.title).toBe("Mùa gặt (viết dở)");
  });

  it("writes text typed during a save once the save is done, without another key press", async () => {
    let finish: (value: StoryAdminDto) => void = () => undefined;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string; body?: StoryRequest }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") {
        const answerOf = answer(5, init.body as StoryRequest);
        return new Promise<StoryAdminDto>((resolve) => (finish = () => resolve(answerOf)));
      }
      return undefined;
    });
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await events.type(screen.getByLabelText("Tóm tắt"), " thêm");
    await act(async () => finish(story()));
    await waitFor(() => expect(stored(draftKey(1, 5))?.state.vi.excerpt).toBe("Tóm tắt thêm"), { timeout: 3000 });
  });

  it("removes the draft on Bỏ bản đó and keeps the saved story", async () => {
    putDraft(draftKey(1, 5), edited());
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await readyBehindQuestion();
    const question = await screen.findByRole("alertdialog", { name: "Có bài đang viết dở" });
    await events.click(within(question).getByRole("button", { name: "Bỏ bản đó" }));
    expect(stored(draftKey(1, 5))).toBeNull();
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveValue("Mùa gặt");
  });

  it("keeps the old draft after Escape until the user types, then keeps the new text", async () => {
    putDraft(draftKey(1, 5), edited());
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await readyBehindQuestion();
    await screen.findByRole("alertdialog", { name: "Có bài đang viết dở" });
    await events.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await new Promise((resolve) => setTimeout(resolve, 1500));
    expect(stored(draftKey(1, 5)).state.vi.title).toBe("Mùa gặt (viết dở)");

    await events.type(screen.getByLabelText(TITLE_LABEL), "?");
    await waitFor(() => expect(stored(draftKey(1, 5)).state.vi.title).toBe("Mùa gặt?"), { timeout: 3000 });
  });

  it("warns when the story was saved again after the draft was written", async () => {
    const older = formState(story({ title: { vi: "Tên cũ hơn", en: "Harvest" } }));
    putDraft(draftKey(1, 5), edited(), { base: older });
    render(<StoryForm initial={story()} />);
    await readyBehindQuestion();
    const question = await screen.findByRole("alertdialog", { name: "Có bài đang viết dở" });
    expect(question).toHaveTextContent("Bài đã được lưu lại sau lúc đó");
  });

  it("removes the draft after a successful save", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
    await waitFor(() => expect(stored(draftKey(1, 5))).not.toBeNull(), { timeout: 3000 });
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    await waitFor(() => expect(stored(draftKey(1, 5))).toBeNull());
  });

  it("removes the draft after Bỏ thay đổi", async () => {
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
    await waitFor(() => expect(stored(draftKey(1, 5))).not.toBeNull(), { timeout: 3000 });
    await events.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
    await events.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Bỏ thay đổi" }));
    expect(stored(draftKey(1, 5))).toBeNull();
  });

  it("offers the draft of a new story on the new story page, and removes it once the story is created", async () => {
    const draftOfNew = formState(story());
    draftOfNew.vi = { title: "Bài mới viết dở", slug: "", excerpt: "", bodyHtml: "" };
    draftOfNew.en = { title: "", slug: "", excerpt: "", bodyHtml: "" };
    draftOfNew.coverMediaId = null;
    const empty = { coverMediaId: null, vi: draftOfNew.en, en: draftOfNew.en };
    putDraft(draftKey(1, undefined), draftOfNew, { base: empty });
    const events = userEvent.setup();
    render(<StoryForm />);
    await readyBehindQuestion();
    await events.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Khôi phục" }));
    expect(screen.getByLabelText(TITLE_LABEL)).toHaveValue("Bài mới viết dở");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/cau-chuyen/9"));
    expect(stored(draftKey(1, undefined))).toBeNull();
  });

  it("keeps working, with a short note, when the browser cannot store the draft", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    const events = userEvent.setup();
    render(<StoryForm initial={story()} />);
    await ready();
    await events.type(screen.getByLabelText(TITLE_LABEL), "!");
    expect(
      await screen.findByText("Máy này không lưu tạm được bài đang viết. Hãy bấm Lưu thường xuyên.", {}, { timeout: 3000 }),
    ).toBeInTheDocument();
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
  });
});


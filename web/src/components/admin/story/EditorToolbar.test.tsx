import { Editor } from "@tiptap/core";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { storyEditorExtensions } from "@/lib/admin/story-editor";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { EditorToolbar } from "./EditorToolbar";

let editor: Editor;

beforeEach(() => {
  adminFetch.mockReset();
  adminFetch.mockResolvedValue([]);
  editor = new Editor({ extensions: storyEditorExtensions(), content: "<p>Xem trang</p>" });
});

afterEach(() => editor.destroy());

async function openLink(events: ReturnType<typeof userEvent.setup>) {
  await events.click(screen.getByRole("button", { name: "Liên kết" }));
  return screen.findByRole("dialog");
}

describe("EditorToolbar link", () => {
  it("applies a link with only an href", async () => {
    const events = userEvent.setup();
    editor.commands.setTextSelection({ from: 1, to: 10 });
    render(<EditorToolbar editor={editor} lang="vi" />);
    const dialog = await openLink(events);
    await events.type(within(dialog).getByLabelText("Địa chỉ liên kết"), "https://nepnha.vn/gioi-thieu");
    await events.click(within(dialog).getByRole("button", { name: "Áp dụng" }));
    expect(editor.getHTML()).toBe('<p><a href="https://nepnha.vn/gioi-thieu">Xem trang</a></p>');
  });

  it("refuses an address that is not allowed and changes nothing", async () => {
    const events = userEvent.setup();
    editor.commands.setTextSelection({ from: 1, to: 10 });
    render(<EditorToolbar editor={editor} lang="vi" />);
    const dialog = await openLink(events);
    await events.type(within(dialog).getByLabelText("Địa chỉ liên kết"), "javascript:alert(1)");
    await events.click(within(dialog).getByRole("button", { name: "Áp dụng" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Địa chỉ không hợp lệ");
    expect(editor.getHTML()).toBe("<p>Xem trang</p>");
  });

  it("adds https:// to an address typed without a scheme", async () => {
    const events = userEvent.setup();
    editor.commands.setTextSelection({ from: 1, to: 10 });
    render(<EditorToolbar editor={editor} lang="vi" />);
    const dialog = await openLink(events);
    await events.type(within(dialog).getByLabelText("Địa chỉ liên kết"), "nepnha.vn");
    await events.click(within(dialog).getByRole("button", { name: "Áp dụng" }));
    expect(editor.getHTML()).toContain('href="https://nepnha.vn"');
  });

  it("asks for a selection when no text is chosen", async () => {
    const events = userEvent.setup();
    editor.commands.setTextSelection(3);
    render(<EditorToolbar editor={editor} lang="vi" />);
    const dialog = await openLink(events);
    await events.type(within(dialog).getByLabelText("Địa chỉ liên kết"), "/lien-he");
    await events.click(within(dialog).getByRole("button", { name: "Áp dụng" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent("Hãy chọn đoạn chữ");
    expect(editor.getHTML()).toBe("<p>Xem trang</p>");
  });

  it("removes an existing link with Bỏ liên kết", async () => {
    const events = userEvent.setup();
    editor.commands.setContent('<p><a href="/lien-he">Xem trang</a></p>');
    editor.commands.setTextSelection(3);
    render(<EditorToolbar editor={editor} lang="vi" />);
    const dialog = await openLink(events);
    expect(within(dialog).getByLabelText("Địa chỉ liên kết")).toHaveValue("/lien-he");
    await events.click(within(dialog).getByRole("button", { name: "Bỏ liên kết" }));
    expect(editor.getHTML()).toBe("<p>Xem trang</p>");
  });
});

describe("EditorToolbar formatting", () => {
  it("marks a pressed tool and toggles bold", async () => {
    const events = userEvent.setup();
    editor.commands.setTextSelection({ from: 1, to: 5 });
    render(<EditorToolbar editor={editor} lang="vi" />);
    const bold = screen.getByRole("button", { name: "In đậm" });
    expect(bold).toHaveAttribute("aria-pressed", "false");
    await events.click(bold);
    expect(editor.getHTML()).toBe("<p><strong>Xem </strong>trang</p>");
    expect(screen.getByRole("button", { name: "In đậm" })).toHaveAttribute("aria-pressed", "true");
  });
});

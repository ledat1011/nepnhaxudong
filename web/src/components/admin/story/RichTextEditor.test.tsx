import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MediaAdminDto } from "@/lib/admin/types";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
const stableReLogin = vi.fn();
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin: stableReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { RichTextEditor } from "./RichTextEditor";

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

function paste(target: Element, html: string) {
  fireEvent.paste(target, {
    clipboardData: {
      types: ["text/html"],
      files: [],
      items: [],
      getData: (type: string) => (type === "text/html" ? html : ""),
    },
  });
}

function Harness({ lang, initial = "", onHtml }: { lang: "vi" | "en"; initial?: string; onHtml(html: string): void }) {
  const [value, setValue] = useState(initial);
  return (
    <RichTextEditor
      lang={lang}
      value={value}
      onChange={(html) => {
        setValue(html);
        onHtml(html);
      }}
    />
  );
}

beforeEach(() => {
  adminFetch.mockReset();
  adminFetch.mockResolvedValue([media(1), media(2)]);
});

describe("RichTextEditor", () => {
  it("has the nine tools and no strike-through or code button", async () => {
    render(<RichTextEditor lang="vi" value="" onChange={vi.fn()} />);
    await screen.findByRole("textbox", { name: "Nội dung" });
    // Each tool says what it does in words on the button: no icon-only button to guess.
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      "Tiêu đề lớn",
      "Tiêu đề nhỏ",
      "Đậm",
      "Nghiêng",
      "Danh sách",
      "Đánh số",
      "Trích dẫn",
      "Liên kết",
      "Chèn ảnh",
    ]);
    expect(buttons.every((button) => !button.hasAttribute("aria-label"))).toBe(true);
  });

  it("emits html without h1, script or style after a paste", async () => {
    const onHtml = vi.fn();
    render(<Harness lang="vi" onHtml={onHtml} />);
    const box = await screen.findByRole("textbox", { name: "Nội dung" });
    paste(box, '<h1>A</h1><script>x</script><p style="color:red">B</p>');
    await waitFor(() => expect(onHtml).toHaveBeenCalled());
    const html = onHtml.mock.calls.at(-1)?.[0] as string;
    expect(html).not.toMatch(/<h1|<script|style=/);
    expect(html).toContain("B");
  });

  it("inserts a library image with the English alt text on the English tab", async () => {
    const onHtml = vi.fn();
    const events = userEvent.setup();
    render(<Harness lang="en" onHtml={onHtml} />);
    await screen.findByRole("textbox", { name: "Nội dung" });
    await events.click(screen.getByRole("button", { name: "Chèn ảnh" }));
    const dialog = await screen.findByRole("dialog");
    await events.click(await within(dialog).findByAltText("Ảnh 2"));
    await waitFor(() => expect(onHtml).toHaveBeenCalled());
    expect(onHtml.mock.calls.at(-1)?.[0]).toBe('<img src="/media/2.webp" alt="Image 2">');
  });

  it("inserts a library image with the Vietnamese alt text on the Vietnamese tab", async () => {
    const onHtml = vi.fn();
    const events = userEvent.setup();
    render(<Harness lang="vi" onHtml={onHtml} />);
    await screen.findByRole("textbox", { name: "Nội dung" });
    await events.click(screen.getByRole("button", { name: "Chèn ảnh" }));
    const dialog = await screen.findByRole("dialog");
    await events.click(await within(dialog).findByAltText("Ảnh 1"));
    await waitFor(() => expect(onHtml).toHaveBeenCalled());
    expect(onHtml.mock.calls.at(-1)?.[0]).toBe('<img src="/media/1.webp" alt="Ảnh 1">');
  });

  it("does not insert an image pasted from another site", async () => {
    const onHtml = vi.fn();
    render(<Harness lang="vi" onHtml={onHtml} />);
    const box = await screen.findByRole("textbox", { name: "Nội dung" });
    paste(box, '<p>x</p><img src="https://evil.example/a.png" alt="e">');
    await waitFor(() => expect(onHtml).toHaveBeenCalled());
    expect(onHtml.mock.calls.at(-1)?.[0]).not.toContain("<img");
  });

  it("does not report a change when the writer only focuses a body that ends with a heading", async () => {
    const onHtml = vi.fn();
    render(<Harness lang="vi" initial="<p>a</p><h2>B</h2>" onHtml={onHtml} />);
    const box = await screen.findByRole("textbox", { name: "Nội dung" });
    await userEvent.click(box);
    box.focus();
    expect(onHtml).not.toHaveBeenCalled();
  });

  it("reports the normalized html once when it differs from the value it was given", async () => {
    const onNormalized = vi.fn();
    render(<RichTextEditor lang="vi" value="<ul><li>x</li></ul>" onChange={vi.fn()} onNormalized={onNormalized} />);
    await screen.findByRole("textbox", { name: "Nội dung" });
    await waitFor(() => expect(onNormalized).toHaveBeenCalledTimes(1));
    expect(onNormalized).toHaveBeenCalledWith("<ul><li><p>x</p></li></ul>", "<ul><li>x</li></ul>");
  });

  it("does not report anything when the value is already normalized", async () => {
    const onNormalized = vi.fn();
    render(<RichTextEditor lang="vi" value="<p>a</p><h2>B</h2>" onChange={vi.fn()} onNormalized={onNormalized} />);
    await screen.findByRole("textbox", { name: "Nội dung" });
    expect(onNormalized).not.toHaveBeenCalled();
  });

  it("cannot be edited while readOnly", async () => {
    render(<RichTextEditor lang="vi" value="<p>a</p>" onChange={vi.fn()} readOnly />);
    const box = await screen.findByRole("textbox", { name: "Nội dung" });
    expect(box).toHaveAttribute("contenteditable", "false");
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
  });

  it("shows a new value that arrives from outside (for example after Hủy)", async () => {
    const { rerender } = render(<RichTextEditor lang="vi" value="<p>Một</p>" onChange={vi.fn()} />);
    const box = await screen.findByRole("textbox", { name: "Nội dung" });
    expect(box).toHaveTextContent("Một");
    rerender(<RichTextEditor lang="vi" value="<p>Hai</p>" onChange={vi.fn()} />);
    await waitFor(() => expect(box).toHaveTextContent("Hai"));
  });
});

"use client";

import type { Editor } from "@tiptap/core";
import { useEditorState } from "@tiptap/react";
import { Bold, Heading2, Heading3, Italic, Link2, List, ListOrdered, Quote, type LucideIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { MediaPicker } from "@/components/admin/media/MediaPicker";
import { Button } from "@/components/admin/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/admin/ui/dialog";
import { Input } from "@/components/admin/ui/input";
import { Label } from "@/components/admin/ui/label";
import { isAllowedStoryLink } from "@/lib/admin/story-editor";
import { useMediaByIds } from "@/lib/admin/use-media-by-ids";

type Props = {
  editor: Editor;
  /** The language of the tab: it decides which alt text an inserted image gets. */
  lang: "vi" | "en";
};

type Tool = {
  label: string;
  icon: LucideIcon;
  active: boolean;
  run(editor: Editor): void;
};

const BAD_LINK_MESSAGE = "Địa chỉ không hợp lệ. Hãy dùng địa chỉ bắt đầu bằng http://, https://, mailto:, tel:, / hoặc #.";
const NO_SELECTION_MESSAGE = "Hãy chọn đoạn chữ cần gắn liên kết trước.";
const LOOKS_LIKE_DOMAIN = /^[\w-]+(\.[\w-]+)+([/?#].*)?$/;

/** "nepnha.vn" is a web address without its scheme: add https://. Anything else is kept as typed. */
function withScheme(address: string): string {
  return LOOKS_LIKE_DOMAIN.test(address) ? `https://${address}` : address;
}

/** The tools of the editor: headings, bold, italic, lists, quote, link and image. Each one is at least 44 px. */
export function EditorToolbar({ editor, lang }: Props) {
  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      h2: current.isActive("heading", { level: 2 }),
      h3: current.isActive("heading", { level: 3 }),
      bold: current.isActive("bold"),
      italic: current.isActive("italic"),
      bullet: current.isActive("bulletList"),
      ordered: current.isActive("orderedList"),
      quote: current.isActive("blockquote"),
      link: current.isActive("link"),
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);

  const tools: Tool[] = [
    {
      label: "Tiêu đề lớn",
      icon: Heading2,
      active: active.h2,
      run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
    },
    {
      label: "Tiêu đề nhỏ",
      icon: Heading3,
      active: active.h3,
      run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
    },
    { label: "In đậm", icon: Bold, active: active.bold, run: (e) => e.chain().focus().toggleBold().run() },
    { label: "In nghiêng", icon: Italic, active: active.italic, run: (e) => e.chain().focus().toggleItalic().run() },
    { label: "Danh sách chấm", icon: List, active: active.bullet, run: (e) => e.chain().focus().toggleBulletList().run() },
    {
      label: "Danh sách số",
      icon: ListOrdered,
      active: active.ordered,
      run: (e) => e.chain().focus().toggleOrderedList().run(),
    },
    { label: "Trích dẫn", icon: Quote, active: active.quote, run: (e) => e.chain().focus().toggleBlockquote().run() },
  ];

  return (
    <div role="toolbar" aria-label="Định dạng bài viết" className="flex flex-wrap items-center gap-1 border-b bg-muted/50 p-1">
      {tools.map(({ label, icon: Icon, active: on, run }) => (
        <Button
          key={label}
          type="button"
          variant={on ? "default" : "outline"}
          size="icon"
          aria-label={label}
          aria-pressed={on}
          // Keep the selection in the editor when the button is pressed.
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => run(editor)}
        >
          <Icon />
        </Button>
      ))}
      <Button
        type="button"
        variant={active.link ? "default" : "outline"}
        size="icon"
        aria-label="Liên kết"
        aria-pressed={active.link}
        onClick={() => setLinkOpen(true)}
      >
        <Link2 />
      </Button>
      <ImageInserter editor={editor} lang={lang} />
      {linkOpen ? <LinkDialog editor={editor} onClose={() => setLinkOpen(false)} /> : null}
    </div>
  );
}

function LinkDialog({ editor, onClose }: { editor: Editor; onClose(): void }) {
  const id = useId();
  const [address, setAddress] = useState(() => (editor.getAttributes("link").href as string | undefined) ?? "");
  const [error, setError] = useState<string | null>(null);
  const hasLink = editor.isActive("link");

  function apply() {
    const value = withScheme(address.trim());
    if (!isAllowedStoryLink(value)) {
      setError(BAD_LINK_MESSAGE);
      return;
    }
    if (editor.state.selection.empty && !hasLink) {
      setError(NO_SELECTION_MESSAGE);
      return;
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: value }).run();
    onClose();
  }

  function remove() {
    editor.chain().focus().extendMarkRange("link").unsetLink().run();
    onClose();
  }

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Liên kết</DialogTitle>
          <DialogDescription>Gắn địa chỉ cho đoạn chữ đang chọn.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={id}>Địa chỉ liên kết</Label>
          <Input
            id={id}
            type="text"
            inputMode="url"
            autoComplete="off"
            value={address}
            onChange={(event) => {
              setAddress(event.target.value);
              setError(null);
            }}
            placeholder="https://"
            aria-invalid={error !== null}
          />
          {error !== null ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
        <DialogFooter className="gap-2">
          {hasLink ? (
            <Button type="button" variant="outline" onClick={remove}>
              Bỏ liên kết
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button type="button" onClick={apply}>
            Áp dụng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** The image button: the user picks from the library and the image goes into the text where the cursor is. */
function ImageInserter({ editor, lang }: Props) {
  // Each pick gets a number, so the same image can be picked twice and is inserted twice.
  const [pick, setPick] = useState<{ id: number; number: number } | null>(null);
  const inserted = useRef(0);
  const { items, loading } = useMediaByIds(pick === null ? [] : [pick.id]);
  const media = items[0];

  useEffect(() => {
    if (pick === null || media === undefined || inserted.current === pick.number) return;
    inserted.current = pick.number;
    // The alt text of the tab's language: a reader of the English page hears the English description.
    const alt = (lang === "en" ? media.altEn : media.altVi) ?? "";
    editor.chain().focus().setImage({ src: media.url, alt }).run();
  }, [pick, media, editor, lang]);

  const notFound = pick !== null && media === undefined && !loading;
  return (
    <div className="flex flex-col gap-1">
      <MediaPicker
        mode="single"
        value={[]}
        triggerLabel="Chèn ảnh"
        onChange={(ids) => setPick(ids[0] === undefined ? null : { id: ids[0], number: (pick?.number ?? 0) + 1 })}
      />
      {notFound ? (
        <p role="alert" className="text-sm text-destructive">
          Không tìm thấy ảnh đã chọn trong thư viện.
        </p>
      ) : null}
    </div>
  );
}

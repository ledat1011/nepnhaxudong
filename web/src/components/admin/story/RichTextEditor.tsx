"use client";

import { EditorContent, useEditor } from "@tiptap/react";
import { useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { editorHtml, storyEditorExtensions } from "@/lib/admin/story-editor";
import { EditorToolbar } from "./EditorToolbar";

type Props = {
  value: string;
  onChange(html: string): void;
  /** The language of the tab: it decides which alt text an inserted image gets. */
  lang: "vi" | "en";
  /**
   * Called once, when the box is made, if its own form of the html differs from `value` (for example it
   * adds a paragraph inside a list item). Gets the new html and the value it was made from.
   * It is not a change by the writer, so `onChange` is not called for it.
   */
  onNormalized?(html: string, from: string): void;
  /** No editing and no tools, for example while a save runs. */
  readOnly?: boolean;
};

// The look of the text inside the editor: the same elements the public page styles in StoryBody.
const CONTENT_CLASS = [
  "min-h-56 p-3 text-base leading-7 outline-none [overflow-wrap:anywhere]",
  "[&_p]:my-3",
  "[&_h2]:mb-2 [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold",
  "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-bold",
  "[&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-6",
  "[&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-grain [&_blockquote]:bg-straw [&_blockquote]:px-4 [&_blockquote]:py-2 [&_blockquote]:italic",
  "[&_a]:font-bold [&_a]:text-coat [&_a]:underline",
  "[&_img]:my-4 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-xl",
].join(" ");

/** A rich text box for a story body. It only offers what the API keeps (see `story-editor.ts`). */
export function RichTextEditor({ value, onChange, lang, onNormalized, readOnly = false }: Props) {
  const extensions = useMemo(() => storyEditorExtensions(), []);
  // The last html this box reported or was given. A different `value` is a change from outside (Hủy, a saved answer).
  const lastSeen = useRef(value);
  const onChangeRef = useRef(onChange);
  const onNormalizedRef = useRef(onNormalized);
  useLayoutEffect(() => {
    onChangeRef.current = onChange;
    onNormalizedRef.current = onNormalized;
  });

  const editor = useEditor({
    extensions,
    content: value,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Nội dung",
        "aria-multiline": "true",
        class: CONTENT_CLASS,
      },
    },
    editable: !readOnly,
    onCreate: ({ editor: created }) => {
      const html = editorHtml(created);
      if (html === value) return;
      // The parent is told, and lastSeen follows, so the effect below does not write the old value back.
      lastSeen.current = html;
      onNormalizedRef.current?.(html, value);
    },
    onUpdate: ({ editor: current }) => {
      const html = editorHtml(current);
      lastSeen.current = html;
      onChangeRef.current(html);
    },
  });

  useEffect(() => {
    if (editor === null || value === lastSeen.current) return;
    lastSeen.current = value;
    // Not reported back: this is the parent's own value, so it is not an edit.
    editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);

  useEffect(() => {
    if (editor !== null && editor.isEditable === readOnly) editor.setEditable(!readOnly);
  }, [editor, readOnly]);

  if (editor === null) return null;
  return (
    <div className="min-w-0 overflow-hidden rounded-md border bg-background focus-within:ring-[3px] focus-within:ring-ring/50">
      {readOnly ? null : <EditorToolbar editor={editor} lang={lang} />}
      <EditorContent editor={editor} />
    </div>
  );
}

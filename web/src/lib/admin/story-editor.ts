import type { Editor, Extensions } from "@tiptap/core";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import OrderedList from "@tiptap/extension-ordered-list";
import StarterKit from "@tiptap/starter-kit";

/**
 * The editor may produce only what the API keeps when it cleans a story (`StorySafelist`):
 * p, h2, h3, strong, em, a[href], ul, ol, li, blockquote, img[src, alt]. This file is a subset of that list.
 */

// Scheme comparison is case-insensitive, like the API.
const LINK_ADDRESS = /^(https?:\/\/|mailto:|tel:|\/|#)/i;
// A tab or line break inside an address is deleted by browsers before they read it, so `/<tab>/x` would mean `//x`.
const CONTROL_CHARACTER = /[\u0000-\u001F\u007F]/;

/** True for an address the API keeps in a link: http, https, mailto, tel, a path of this site or a #fragment. */
export function isAllowedStoryLink(address: string): boolean {
  return (
    LINK_ADDRESS.test(address) &&
    !CONTROL_CHARACTER.test(address) &&
    !address.startsWith("//") &&
    !address.includes("\\")
  );
}

/** Only the library images (`/media/...`) are accepted: no image from another site, no inline data. */
const LIBRARY_IMAGE_SELECTOR = 'img[src^="/media/"]';

/**
 * Like `StorySafelist.isSafeImageSource` of the API for a library image: nothing that could leave `/media/`
 * (`..`, an encoded dot, a backslash) and no control character.
 */
export function isSafeLibraryImageSource(src: string): boolean {
  const lower = src.toLowerCase();
  return (
    src.startsWith("/media/") &&
    !CONTROL_CHARACTER.test(src) &&
    !lower.includes("..") &&
    !lower.includes("%2e") &&
    !src.includes("\\")
  );
}

export function storyEditorExtensions(): Extensions {
  return [
    StarterKit.configure({
      // The API drops every tag below, so offering them would only lose the writer's work.
      code: false,
      codeBlock: false,
      horizontalRule: false,
      strike: false,
      underline: false,
      hardBreak: false,
      heading: { levels: [2, 3] },
      // Its extra paragraph after a heading, list, quote or image would turn an untouched story into a changed one.
      trailingNode: false,
      // Added below without the start and type attributes, which the API drops.
      orderedList: false,
      // Link is configured below, because its attributes cannot be limited through the StarterKit option.
      link: false,
    }),
    Link.extend({
      // Only href exists, so a pasted target, rel, class or title is dropped (the API would drop them too).
      addAttributes() {
        return { href: { default: null } };
      },
    }).configure({
      openOnClick: false,
      autolink: false,
      HTMLAttributes: { target: null, rel: null, class: null },
      isAllowedUri: (address) => isAllowedStoryLink(address),
    }),
    OrderedList.extend({
      addAttributes() {
        return {};
      },
    }),
    Image.extend({
      // Only src and alt exist, so a pasted title, width or height is dropped.
      addAttributes() {
        return { src: { default: null }, alt: { default: null } };
      },
      parseHTML() {
        return [
          {
            tag: LIBRARY_IMAGE_SELECTOR,
            getAttrs: (element) => (isSafeLibraryImageSource(element.getAttribute("src") ?? "") ? null : false),
          },
        ];
      },
    }),
  ];
}

/** The html of the document, or "" for an empty one (Tiptap writes `<p></p>`). */
export function editorHtml(editor: Editor): string {
  return editor.isEmpty ? "" : editor.getHTML();
}

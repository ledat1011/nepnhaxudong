import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";
import { editorHtml, isAllowedStoryLink, storyEditorExtensions } from "./story-editor";

let editor: Editor | null = null;

function htmlAfterLoading(content: string): string {
  editor = new Editor({ extensions: storyEditorExtensions(), content });
  return editor.getHTML();
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("storyEditorExtensions", () => {
  it("drops h1, script and style attributes that the API would strip", () => {
    const html = htmlAfterLoading('<h1>A</h1><script>x</script><p style="color:red">B</p>');
    expect(html).not.toMatch(/<h1|<script|style=/);
    expect(html).toContain("A");
    expect(html).toContain("B");
  });

  it("keeps h2, h3, lists, quotes, bold and italic", () => {
    const source =
      "<h2>A</h2><h3>B</h3><p><strong>c</strong> <em>d</em></p><ul><li><p>e</p></li></ul><ol><li><p>f</p></li></ol><blockquote><p>g</p></blockquote>";
    expect(htmlAfterLoading(source)).toBe(source);
  });

  it("has no strike, underline, code, code block, rule or line break", () => {
    const html = htmlAfterLoading(
      "<p><s>a</s> <u>b</u> <code>c</code></p><pre><code>d</code></pre><hr><p>e<br>f</p>",
    );
    expect(html).not.toMatch(/<s>|<u>|<code|<pre|<hr|<br/);
  });

  it("keeps only href on a link, with no target, rel, class or title", () => {
    const html = htmlAfterLoading('<p><a href="/lien-he" target="_blank" rel="nofollow" class="x" title="t">a</a></p>');
    expect(html).toBe('<p><a href="/lien-he">a</a></p>');
  });

  it("drops a link whose address is not allowed", () => {
    const html = htmlAfterLoading('<p><a href="javascript:alert(1)">a</a> <a href="//evil.example/x">b</a></p>');
    expect(html).not.toContain("<a");
  });

  it("keeps only src and alt on an image from the library and drops every other image", () => {
    const html = htmlAfterLoading(
      '<img src="/media/a.webp" alt="Lúa" title="t" width="10"><img src="https://x.example/a.png" alt="x"><img src="data:image/png;base64,AAAA">',
    );
    expect(html).toBe('<img src="/media/a.webp" alt="Lúa">');
  });
});

describe("storyEditorExtensions (fix round)", () => {
  it("adds no trailing paragraph after a heading, a list, a quote or an image", () => {
    expect(htmlAfterLoading("<p>a</p><h2>B</h2>")).toBe("<p>a</p><h2>B</h2>");
    expect(htmlAfterLoading("<blockquote><p>q</p></blockquote>")).toBe("<blockquote><p>q</p></blockquote>");
    expect(htmlAfterLoading('<img src="/media/a.webp" alt="x">')).toBe('<img src="/media/a.webp" alt="x">');
  });

  it.each(["/media/../api/admin/users", "/media/%2e%2E/x", "/media/%2E./x", "/media/a\\b.webp", "/media/a&#9;b.webp"])(
    "drops an image whose address could leave /media/: %j",
    (src) => {
      const html = htmlAfterLoading('<p>x</p><img src="' + src + '" alt="e">');
      expect(html).not.toContain("<img");
    },
  );

  it("keeps no start or type on an ordered list", () => {
    expect(htmlAfterLoading('<ol start="3" type="a"><li>x</li></ol>')).toBe("<ol><li><p>x</p></li></ol>");
  });
});

describe("isAllowedStoryLink", () => {
  it.each(["https://a.vn", "http://a.vn", "mailto:a@b.vn", "tel:+84123", "/gioi-thieu", "#top", "HTTPS://a.vn"])(
    "allows %s",
    (address) => expect(isAllowedStoryLink(address)).toBe(true),
  );

  it.each(["javascript:alert(1)", "//evil.example", "/\\evil", "ftp://a.vn", "data:text/html,x", "a.vn", "", "/a\tb"])(
    "refuses %j",
    (address) => expect(isAllowedStoryLink(address)).toBe(false),
  );
});

describe("editorHtml", () => {
  it("is an empty string for an empty document, not an empty paragraph", () => {
    editor = new Editor({ extensions: storyEditorExtensions(), content: "" });
    expect(editor.getHTML()).toBe("<p></p>");
    expect(editorHtml(editor)).toBe("");
  });

  it("is the html of a document that has text", () => {
    editor = new Editor({ extensions: storyEditorExtensions(), content: "<p>a</p>" });
    expect(editorHtml(editor)).toBe("<p>a</p>");
  });
});

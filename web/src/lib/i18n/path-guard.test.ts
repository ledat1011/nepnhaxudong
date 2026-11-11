import { describe, expect, it } from "vitest";
import { classifyPath } from "./path-guard";

describe("classifyPath", () => {
  it("sends the root to the language redirect", () => {
    expect(classifyPath("/")).toBe("redirect-root");
  });

  it("lets both language homes through", () => {
    expect(classifyPath("/vi")).toBe("pass");
    expect(classifyPath("/en")).toBe("pass");
    expect(classifyPath("/vi/")).toBe("pass");
  });

  it("lets the story section of the same language through", () => {
    expect(classifyPath("/vi/cau-chuyen")).toBe("pass");
    expect(classifyPath("/vi/cau-chuyen/mua-gat")).toBe("pass");
    expect(classifyPath("/en/stories")).toBe("pass");
    expect(classifyPath("/en/stories/harvest")).toBe("pass");
  });

  it("lets the image routes under a language through", () => {
    expect(classifyPath("/vi/opengraph-image/default")).toBe("pass");
    expect(classifyPath("/vi/cau-chuyen/opengraph-image/default")).toBe("pass");
    expect(classifyPath("/vi/cau-chuyen/mua-gat/opengraph-image/default")).toBe("pass");
  });

  it("lets Next internals, API routes and the app's own files through", () => {
    for (const path of [
      "/_next/static/chunks/a.js",
      "/_next/image",
      "/_not-found",
      "/api/revalidate",
      "/robots.txt",
      "/sitemap.xml",
      "/icon.svg",
    ]) {
      expect(classifyPath(path), path).toBe("pass");
    }
  });

  it("lets the journey photos through, and nothing else under /journey", () => {
    expect(classifyPath("/journey/2021-bao-dau-tien.webp")).toBe("pass");
    expect(classifyPath("/journey/a.svg")).toBe("not-found");
    expect(classifyPath("/journey/a/b.webp")).toBe("not-found");
    expect(classifyPath("/journey")).toBe("not-found");
  });

  it("lets the hero picture through, and nothing else under /hero", () => {
    expect(classifyPath("/hero/nen-que.webp")).toBe("pass");
    expect(classifyPath("/hero/a.svg")).toBe("not-found");
    expect(classifyPath("/hero/a/b.webp")).toBe("not-found");
    expect(classifyPath("/hero")).toBe("not-found");
  });

  it("lets the press photos through, and nothing else under /press", () => {
    expect(classifyPath("/press/2025-nhi-chieu-nep-cai-hoa-vang.webp")).toBe("pass");
    expect(classifyPath("/press/a.svg")).toBe("not-found");
    expect(classifyPath("/press")).toBe("not-found");
  });

  it("does not treat a name of the object prototype as a picture folder", () => {
    expect(classifyPath("/constructor/a.webp")).toBe("not-found");
  });

  it("lets the story scene files through, and nothing else under /story", () => {
    // The layered SVG scenes are gone (decision 0017): only the WebP sketches are left.
    expect(classifyPath("/story/canh-1-cay-ma.svg")).toBe("not-found");
    expect(classifyPath("/story/canh-1-cay-ma.webp")).toBe("pass");
    expect(classifyPath("/story/a/b.webp")).toBe("not-found");
    expect(classifyPath("/story/a.png")).toBe("not-found");
    expect(classifyPath("/story")).toBe("not-found");
    expect(classifyPath("/story/a/b.svg")).toBe("not-found");
    expect(classifyPath("/story/a.php")).toBe("not-found");
    // Pinned as they are today: the guard looks at the plain segments only. Next serves a file
    // from `public/` only when its name matches exactly, so these still end in a 404.
    expect(classifyPath("/story/.webp")).toBe("pass");
    expect(classifyPath("/story/a.webp/")).toBe("pass");
    expect(classifyPath("/story/a%2Fb.webp")).toBe("pass");
  });

  it("lets the moving layers of the story scenes through, one level deep", () => {
    expect(classifyPath("/lop/say-fan.webp")).toBe("pass");
    expect(classifyPath("/lop/a/b.webp")).toBe("not-found");
    expect(classifyPath("/lop/a.png")).toBe("not-found");
    expect(classifyPath("/story/lop/say-fan.webp")).toBe("not-found");
  });

  it("answers 404 for a first segment that is not a language", () => {
    for (const path of ["/fr", "/fr/x", "/wp-login.php", "/favicon.ico", "/VI", "/vi.php", "/a/b/c/d"]) {
      expect(classifyPath(path), path).toBe("not-found");
    }
  });

  it("answers 404 for the section of the other language", () => {
    expect(classifyPath("/vi/stories")).toBe("not-found");
    expect(classifyPath("/en/cau-chuyen/mua-gat")).toBe("not-found");
    expect(classifyPath("/vi/khong-co")).toBe("not-found");
  });

  it("does not let a similar name pass as an internal path", () => {
    expect(classifyPath("/apix")).toBe("not-found");
    expect(classifyPath("/_nextx/a")).toBe("not-found");
    expect(classifyPath("/robots.txt/x")).toBe("not-found");
    expect(classifyPath("/administrator")).toBe("not-found");
    expect(classifyPath("/mediax/a.jpg")).toBe("not-found");
  });
});

describe("classifyPath for the admin area and local media", () => {
  it("lets /admin pages and /media files through", () => {
    for (const path of ["/admin", "/admin/", "/admin/cau-chuyen/3", "/media/2026/11/a.jpg"]) {
      expect(classifyPath(path), path).toBe("pass");
    }
  });
});

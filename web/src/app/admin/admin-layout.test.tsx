import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// next/font only works inside the Next compiler.
vi.mock("@/app/fonts", () => ({ fontClassName: "font-test" }));

// The session provider uses the router, which exists only inside a running Next app.
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));

import AdminLayout, { metadata } from "./layout";

describe("admin root layout", () => {
  it("renders its own <html lang=vi> document around the page", () => {
    const html = renderToStaticMarkup(
      <AdminLayout>
        <p>Nội dung thử</p>
      </AdminLayout>,
    );
    expect(html).toMatch(/^<html lang="vi" class="font-test[^"]*">/);
    expect(html).toContain("<body");
    expect(html).toContain("Nội dung thử");
  });

  it("is never indexed and has a title template", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toMatchObject({ template: "%s · Quản trị Nếp Nhà" });
  });
});

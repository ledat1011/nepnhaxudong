import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// next/font only works inside the Next compiler.
vi.mock("@/app/fonts", () => ({ fontClassName: "font-test" }));

import AdminLayout, { metadata } from "./layout";
import AdminPage from "./page";

describe("admin root layout", () => {
  it("renders its own <html lang=vi> document around the page", () => {
    const html = renderToStaticMarkup(
      <AdminLayout>
        <AdminPage />
      </AdminLayout>,
    );
    expect(html).toMatch(/^<html lang="vi" class="font-test[^"]*">/);
    expect(html).toContain("<body");
    expect(html).toContain("Quản trị Nếp Nhà");
  });

  it("is never indexed and has a title template", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
    expect(metadata.title).toMatchObject({ template: "%s · Quản trị Nếp Nhà" });
  });
});

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductAdminDto, ProductRequest } from "@/lib/admin/types";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), dismiss: vi.fn() }) }));

import { ScreenDetailContext } from "@/components/admin/shell/screen-detail";
import { ProductForm } from "./ProductForm";

const product: ProductAdminDto = {
  id: 7,
  sortOrder: 3,
  showPrice: false,
  visible: true,
  name: { vi: "Gạo nếp", en: null },
  description: { vi: null, en: null },
  features: { vi: ["Thơm"], en: [] },
  cookingTips: { vi: null, en: null },
  packagings: [],
  mediaIds: [],
  missingEn: true,
};

beforeEach(() => {
  adminFetch.mockReset();
  adminFetch.mockImplementation(async (path: string, init?: { method?: string; body?: ProductRequest }) => {
    if (init?.method === "PUT") return { ...product, name: init.body!.name };
    if (path === "/admin/products/7/show") return { ...product, visible: true };
    return path.startsWith("/admin/media") ? [] : undefined;
  });
});

describe("ProductForm header", () => {
  it("has no public page while the product is hidden, and gets it once Hiện trên web is on", async () => {
    const setDetail = vi.fn();
    const events = userEvent.setup();
    render(
      <ScreenDetailContext.Provider value={setDetail}>
        <ProductForm initial={{ ...product, visible: false }} />
      </ScreenDetailContext.Provider>,
    );
    expect(setDetail).toHaveBeenLastCalledWith({ name: "Gạo nếp", publicHref: null });
    await events.click(screen.getByRole("switch", { name: "Hiện trên web" }));
    await events.click(screen.getByRole("button", { name: "Vẫn hiện" }));
    await waitFor(() => expect(setDetail).toHaveBeenLastCalledWith({ name: "Gạo nếp", publicHref: "/vi#san-pham" }));
  });

  it("names a new product and has no public page yet", () => {
    const setDetail = vi.fn();
    render(
      <ScreenDetailContext.Provider value={setDetail}>
        <ProductForm />
      </ScreenDetailContext.Provider>,
    );
    expect(setDetail).toHaveBeenLastCalledWith({ name: "Sản phẩm mới", publicHref: null });
  });

  it("shows the saved name and the product section of the public site, and follows a saved new name", async () => {
    const setDetail = vi.fn();
    const events = userEvent.setup();
    render(
      <ScreenDetailContext.Provider value={setDetail}>
        <ProductForm initial={product} />
      </ScreenDetailContext.Provider>,
    );
    expect(setDetail).toHaveBeenLastCalledWith({ name: "Gạo nếp", publicHref: "/vi#san-pham" });
    const name = screen.getAllByLabelText(/^Tiếng Việt/)[0];
    await events.type(name, " cái hoa vàng");
    // Typing does not rename the header: it names what is saved.
    expect(setDetail).toHaveBeenLastCalledWith({ name: "Gạo nếp", publicHref: "/vi#san-pham" });
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() =>
      expect(setDetail).toHaveBeenLastCalledWith({ name: "Gạo nếp cái hoa vàng", publicHref: "/vi#san-pham" }),
    );
  });
});

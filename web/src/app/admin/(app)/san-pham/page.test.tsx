import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductAdminDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin, push } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
  push: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ requireReLogin }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import ProductsPage from "./page";

function product(id: number, missingEn: boolean, packagings: number, visible = true): ProductAdminDto {
  return {
    id,
    sortOrder: id,
    showPrice: false,
    visible,
    name: { vi: `Sản phẩm ${id}`, en: missingEn ? null : `Product ${id}` },
    description: { vi: null, en: null },
    features: { vi: ["a"], en: [] },
    cookingTips: { vi: null, en: null },
    packagings: Array.from({ length: packagings }, (_, i) => ({
      weightGrams: 100 * (i + 1),
      priceVnd: null,
      sortOrder: i,
    })),
    mediaIds: [],
    missingEn,
  };
}

beforeEach(() => {
  adminFetch.mockReset();
  push.mockReset();
});

describe("Sản phẩm list page", () => {
  it("lists the products with the missing-EN badge and the pack size count", async () => {
    adminFetch.mockResolvedValue([product(1, true, 2), product(2, false, 1)]);
    render(<ProductsPage />);
    const first = await screen.findByRole("link", { name: /Sản phẩm 1/ });
    expect(first).toHaveAttribute("href", "/admin/san-pham/1");
    expect(first).toHaveTextContent("Thiếu EN");
    expect(first).toHaveTextContent("2 quy cách");
    const second = screen.getByRole("link", { name: /Sản phẩm 2/ });
    expect(second).not.toHaveTextContent("Thiếu EN");
    expect(second).toHaveTextContent("1 quy cách");
    expect(screen.getByRole("link", { name: "Thêm sản phẩm" })).toHaveAttribute("href", "/admin/san-pham/moi");
    expect(adminFetch).toHaveBeenCalledWith("/admin/products");
  });

  it("marks a hidden product with Đang ẩn and gives every row its own switch", async () => {
    adminFetch.mockResolvedValue([product(1, false, 1, false), product(2, false, 1, true)]);
    render(<ProductsPage />);
    const hidden = await screen.findByRole("link", { name: /Sản phẩm 1/ });
    expect(hidden).toHaveTextContent("Đang ẩn");
    expect(screen.getByRole("link", { name: /Sản phẩm 2/ })).not.toHaveTextContent("Đang ẩn");
    expect(screen.getByRole("switch", { name: "Hiện trên web: Sản phẩm 1" })).not.toBeChecked();
    expect(screen.getByRole("switch", { name: "Hiện trên web: Sản phẩm 2" })).toBeChecked();
  });

  it("shows a product from the list after the check panel and updates its row", async () => {
    const events = userEvent.setup();
    adminFetch.mockImplementation(async (path: string) => {
      if (path === "/admin/products/1/show") return product(1, false, 1, true);
      return [product(1, false, 1, false)];
    });
    render(<ProductsPage />);
    await events.click(await screen.findByRole("switch", { name: "Hiện trên web: Sản phẩm 1" }));
    await events.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Vẫn hiện" }));
    await waitFor(() => expect(screen.getByRole("switch", { name: "Hiện trên web: Sản phẩm 1" })).toBeChecked());
    expect(screen.getByRole("link", { name: /Sản phẩm 1/ })).not.toHaveTextContent("Đang ẩn");
  });

  it("opens the product at the first gap on Quay lại sửa", async () => {
    const events = userEvent.setup();
    adminFetch.mockResolvedValue([product(1, false, 1, false)]);
    render(<ProductsPage />);
    await events.click(await screen.findByRole("switch", { name: "Hiện trên web: Sản phẩm 1" }));
    await events.click(screen.getByRole("button", { name: "Quay lại sửa" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/san-pham/1?o=product.images"));
  });
});

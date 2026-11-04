import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ProductAdminDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ requireReLogin }),
}));

import ProductsPage from "./page";

function product(id: number, missingEn: boolean, packagings: number): ProductAdminDto {
  return {
    id,
    sortOrder: id,
    showPrice: false,
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

beforeEach(() => adminFetch.mockReset());

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
});

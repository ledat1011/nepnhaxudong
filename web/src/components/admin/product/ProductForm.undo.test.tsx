import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "@/components/admin/ui/sonner";
import type { MediaAdminDto, ProductAdminDto } from "@/lib/admin/types";

const { adminFetch } = vi.hoisted(() => ({ adminFetch: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin: vi.fn() }) }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

import { ProductForm } from "./ProductForm";

function media(id: number): MediaAdminDto {
  return { id, url: `/media/${id}.webp`, width: 10, height: 10, mime: "image/webp", altVi: `Ảnh ${id}`, altEn: `Image ${id}` };
}

const product: ProductAdminDto = {
  id: 7,
  sortOrder: 3,
  showPrice: false,
  name: { vi: "Gạo nếp", en: null },
  description: { vi: null, en: null },
  features: { vi: ["Thơm"], en: [] },
  cookingTips: { vi: null, en: null },
  packagings: [{ weightGrams: 1000, priceVnd: null, sortOrder: 0 }],
  mediaIds: [1, 2],
  missingEn: true,
};

beforeEach(() => {
  adminFetch.mockReset();
  adminFetch.mockImplementation(async (path: string) => (path.startsWith("/admin/media") ? [media(1), media(2)] : undefined));
});

afterEach(() => {
  act(() => toast.dismiss());
});

describe("ProductForm rows", () => {
  it("takes an image off the product at once and puts it back with Hoàn tác", async () => {
    const events = userEvent.setup();
    render(
      <>
        <ProductForm initial={product} />
        <Toaster />
      </>,
    );
    await events.click(await screen.findByRole("button", { name: "Bỏ ảnh Ảnh 1" }));
    expect(screen.queryByRole("button", { name: "Bỏ ảnh Ảnh 1" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lưu" })).toBeEnabled();

    const message = (await screen.findByText("Đã bỏ ảnh 1 khỏi sản phẩm.")).closest("li")!;
    await events.click(within(message).getByRole("button", { name: "Hoàn tác" }));
    expect(screen.getAllByRole("button", { name: /^Bỏ ảnh/ }).map((b) => b.getAttribute("aria-label"))).toEqual([
      "Bỏ ảnh Ảnh 1",
      "Bỏ ảnh Ảnh 2",
    ]);
    // Back as it was saved: nothing is left to save.
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
  });
});

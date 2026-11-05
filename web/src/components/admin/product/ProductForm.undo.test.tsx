import { act, render, screen, waitFor, within } from "@testing-library/react";
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
  visible: true,
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

  function renderForm(initial?: ProductAdminDto) {
    return render(
      <>
        <ProductForm initial={initial} />
        <Toaster />
      </>,
    );
  }
  const undoButtons = () => screen.queryAllByRole("button", { name: "Hoàn tác" });
  const imageNames = () => screen.queryAllByRole("button", { name: /^Bỏ ảnh/ }).map((b) => b.getAttribute("aria-label"));

  it("closes the Hoàn tác messages when the changes are dropped, so nothing comes back twice", async () => {
    const events = userEvent.setup();
    renderForm(product);
    await events.click(await screen.findByRole("button", { name: "Bỏ ảnh Ảnh 1" }));
    await screen.findByText("Đã bỏ ảnh 1 khỏi sản phẩm.");
    await events.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
    await events.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Bỏ thay đổi" }));
    expect(imageNames()).toEqual(["Bỏ ảnh Ảnh 1", "Bỏ ảnh Ảnh 2"]);
    await waitFor(() => expect(undoButtons()).toHaveLength(0));
  });

  it("does not add an image twice when it was picked again before Hoàn tác", async () => {
    const events = userEvent.setup();
    renderForm(product);
    await events.click(await screen.findByRole("button", { name: "Bỏ ảnh Ảnh 1" }));
    const message = (await screen.findByText("Đã bỏ ảnh 1 khỏi sản phẩm.")).closest("li")!;
    await events.click(screen.getByRole("button", { name: "Chọn ảnh" }));
    const picker = await screen.findByRole("dialog");
    await events.click(await within(picker).findByAltText("Ảnh 1"));
    await events.click(within(picker).getByRole("button", { name: "Xong" }));
    expect(imageNames()).toEqual(["Bỏ ảnh Ảnh 2", "Bỏ ảnh Ảnh 1"]);
    await events.click(within(message).getByRole("button", { name: "Hoàn tác" }));
    expect(imageNames()).toEqual(["Bỏ ảnh Ảnh 2", "Bỏ ảnh Ảnh 1"]);
    expect(await screen.findByText("Mục này đã có lại trong danh sách.")).toBeInTheDocument();
  });

  it("closes the Hoàn tác messages when the product is saved", async () => {
    const events = userEvent.setup();
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (init?.method === "PUT") return { ...product, mediaIds: [2] };
      return path.startsWith("/admin/media") ? [media(1), media(2)] : undefined;
    });
    renderForm(product);
    await events.click(await screen.findByRole("button", { name: "Bỏ ảnh Ảnh 1" }));
    await screen.findByText("Đã bỏ ảnh 1 khỏi sản phẩm.");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(undoButtons()).toHaveLength(0));
    expect(imageNames()).toEqual(["Bỏ ảnh Ảnh 2"]);
  });

  it("closes the Hoàn tác messages when a new product is created, while its boxes are locked", async () => {
    const events = userEvent.setup();
    let finish!: (value: ProductAdminDto) => void;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (init?.method === "POST") return new Promise<ProductAdminDto>((resolve) => (finish = resolve));
      return path.startsWith("/admin/media") ? [] : undefined;
    });
    renderForm();
    await events.type(screen.getAllByLabelText(/^Tiếng Việt/)[0], "Gạo mới");
    await events.click(screen.getByRole("button", { name: "Thêm quy cách" }));
    await events.click(screen.getByRole("button", { name: "Thêm quy cách" }));
    const weights = screen.getAllByLabelText(/^Khối lượng/);
    await events.type(weights[0], "500");
    await events.type(weights[1], "1000");
    await events.click(screen.getByRole("button", { name: "Xóa quy cách 1" }));
    expect(undoButtons()).toHaveLength(1);
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(undoButtons()).toHaveLength(0));
    await act(async () => finish({ ...product, id: 9 }));
  });
});

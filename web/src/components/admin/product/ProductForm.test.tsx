import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { MediaAdminDto, ProductAdminDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin, push, replace } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch, adminUpload: vi.fn() }));
vi.mock("@/lib/admin/session", () => ({
  useAdminSession: () => ({ requireReLogin }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));

import { ProductForm } from "./ProductForm";

function media(id: number): MediaAdminDto {
  return {
    id,
    url: `/media/${id}.webp`,
    width: 10,
    height: 10,
    mime: "image/webp",
    altVi: `Ảnh ${id}`,
    altEn: `Image ${id}`,
  };
}

function product(overrides: Partial<ProductAdminDto> = {}): ProductAdminDto {
  return {
    id: 7,
    sortOrder: 3,
    showPrice: true,
    name: { vi: "Gạo ST25", en: "ST25 rice" },
    description: { vi: null, en: null },
    features: { vi: ["Thơm"], en: ["Fragrant"] },
    cookingTips: { vi: null, en: null },
    packagings: [{ weightGrams: 1000, priceVnd: 50000, sortOrder: 0 }],
    mediaIds: [],
    missingEn: false,
    ...overrides,
  };
}

function writeBodies(): unknown[] {
  return adminFetch.mock.calls
    .filter(([, init]) => init?.method === "PUT" || init?.method === "POST")
    .map(([, init]) => init.body);
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  push.mockReset();
  replace.mockReset();
  adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
    if (path.startsWith("/admin/media")) return [media(1), media(2)];
    if (init?.method === "PUT" || init?.method === "POST") return product();
    return undefined;
  });
});

describe("ProductForm", () => {
  it("hides the price boxes when the price is turned off but still sends the typed prices", async () => {
    const events = userEvent.setup();
    render(<ProductForm initial={product()} />);
    expect(screen.getByLabelText("Giá (VND)")).toHaveValue(50000);
    await events.click(screen.getByRole("switch", { name: "Hiện giá" }));
    expect(screen.queryByLabelText("Giá (VND)")).not.toBeInTheDocument();
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writeBodies()).toHaveLength(1));
    expect(writeBodies()[0]).toMatchObject({
      showPrice: false,
      packagings: [{ weightGrams: 1000, priceVnd: 50000 }],
    });
  });

  it("locks the add button at 20 pack sizes", async () => {
    const events = userEvent.setup();
    const packagings = Array.from({ length: 19 }, (_, i) => ({
      weightGrams: 100 + i,
      priceVnd: null,
      sortOrder: i,
    }));
    render(<ProductForm initial={product({ packagings })} />);
    const add = screen.getByRole("button", { name: "Thêm quy cách" });
    expect(add).toBeEnabled();
    await events.click(add);
    expect(screen.getAllByLabelText("Khối lượng (gam)")).toHaveLength(20);
    expect(screen.getByRole("button", { name: "Thêm quy cách" })).toBeDisabled();
  });

  it("sends name.en as null when the English box is empty and trims the text", async () => {
    const events = userEvent.setup();
    render(<ProductForm />);
    const [nameVi] = screen.getAllByLabelText(/^Tiếng Việt/);
    await events.type(nameVi, "  Gạo mới  ");
    await events.click(screen.getByRole("button", { name: "Thêm đặc điểm" }));
    await events.type(screen.getByLabelText("Đặc điểm 1 (tiếng Việt)"), "Dẻo");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writeBodies()).toHaveLength(1));
    const body = writeBodies()[0] as { name: unknown; features: unknown };
    expect(body.name).toEqual({ vi: "Gạo mới", en: null });
    expect(body.features).toEqual({ vi: ["Dẻo"], en: [] });
    expect(adminFetch).toHaveBeenCalledWith("/admin/products", expect.objectContaining({ method: "POST" }));
  });

  it("keeps the image order after moving an image up", async () => {
    const events = userEvent.setup();
    render(<ProductForm initial={product({ mediaIds: [1, 2] })} />);
    await screen.findAllByRole("img");
    await events.click(screen.getByRole("button", { name: "Đưa ảnh Ảnh 2 lên" }));
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writeBodies()).toHaveLength(1));
    expect(writeBodies()[0]).toMatchObject({ mediaIds: [2, 1] });
  });

  it("sends a failed 401 save again after re-login with exactly the typed data", async () => {
    const events = userEvent.setup();
    requireReLogin.mockResolvedValue(undefined);
    let first = true;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") {
        if (first) {
          first = false;
          throw new AdminApiError(401, "Phiên đã hết hạn.", "session-expired");
        }
        return product();
      }
      return undefined;
    });
    render(<ProductForm initial={product()} />);
    const [nameVi] = screen.getAllByLabelText(/^Tiếng Việt/);
    await events.type(nameVi, " mới");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writeBodies()).toHaveLength(2));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(writeBodies()[1]).toEqual(writeBodies()[0]);
    expect(writeBodies()[1]).toMatchObject({
      name: { vi: "Gạo ST25 mới", en: "ST25 rice" },
    });
  });

  it("asks before deleting and deletes only after the user confirms", async () => {
    const events = userEvent.setup();
    render(<ProductForm initial={product()} />);
    await events.click(screen.getByRole("button", { name: "Xóa sản phẩm" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(adminFetch).not.toHaveBeenCalledWith("/admin/products/7", expect.anything());
    await events.click(within(dialog).getByRole("button", { name: "Xóa" }));
    await waitFor(() =>
      expect(adminFetch).toHaveBeenCalledWith("/admin/products/7", {
        method: "DELETE",
      }),
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/san-pham"));
  });

  it("shows the API detail when the save fails and keeps the typed text", async () => {
    const events = userEvent.setup();
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") throw new AdminApiError(400, "Đặc điểm (tiếng Việt) cần có ít nhất một mục.");
      return undefined;
    });
    render(<ProductForm initial={product()} />);
    const [nameVi] = screen.getAllByLabelText(/^Tiếng Việt/);
    await events.type(nameVi, "!");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Đặc điểm (tiếng Việt) cần có ít nhất một mục.");
    expect(nameVi).toHaveValue("Gạo ST25!");
  });
});

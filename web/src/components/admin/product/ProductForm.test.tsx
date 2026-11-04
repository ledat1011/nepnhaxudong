import { act, render, screen, waitFor, within } from "@testing-library/react";
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

import { NavGuardProvider } from "@/lib/admin/nav-guard";
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
  it("sends one create request however often Lưu is tapped, then goes to the new product", async () => {
    const events = userEvent.setup();
    let resolvePost: (value: ProductAdminDto) => void = () => {};
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "POST") return new Promise<ProductAdminDto>((resolve) => (resolvePost = resolve));
      return undefined;
    });
    render(<ProductForm />);
    await events.type(screen.getAllByLabelText(/^Tiếng Việt/)[0], "Gạo mới");
    await events.click(screen.getByRole("button", { name: "Thêm đặc điểm" }));
    await events.type(screen.getByLabelText("Đặc điểm 1 (tiếng Việt)"), "Dẻo");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await events.click(screen.getByRole("button", { name: /Đang lưu/ }));
    resolvePost(product({ id: 9 }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/san-pham/9"));
    const locked = screen.getByRole("button", { name: /Đang lưu/ });
    await events.click(locked);
    expect(locked).toBeDisabled();
    expect(writeBodies()).toHaveLength(1);
  });

  it("locks Xóa sản phẩm after a successful delete", async () => {
    const events = userEvent.setup();
    render(<ProductForm initial={product()} />);
    await events.click(screen.getByRole("button", { name: "Xóa sản phẩm" }));
    await events.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/admin/san-pham"));
    expect(screen.getByRole("button", { name: "Xóa sản phẩm" })).toBeDisabled();
  });

  it("stays on the page and shows the API detail when the delete fails", async () => {
    const events = userEvent.setup();
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "DELETE") throw new AdminApiError(409, "Sản phẩm đang được dùng.");
      return undefined;
    });
    render(<ProductForm initial={product()} />);
    await events.click(screen.getByRole("button", { name: "Xóa sản phẩm" }));
    await events.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Xóa" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Sản phẩm đang được dùng.");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Xóa sản phẩm" })).toBeEnabled();
  });

  it.each([
    ["weight", { weightGrams: 1e20, priceVnd: null, sortOrder: 0 }, "khối lượng quá lớn"],
    ["price", { weightGrams: 1000, priceVnd: 1e20, sortOrder: 0 }, "giá quá lớn"],
  ])("refuses a %s above the limit without calling the API", async (_name, packaging, message) => {
    const events = userEvent.setup();
    render(<ProductForm initial={product({ packagings: [packaging] })} />);
    await events.type(screen.getAllByLabelText(/^Tiếng Việt/)[0], "!");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(writeBodies()).toHaveLength(0);
  });

  it("sends features that have more Vietnamese than English items as they are", async () => {
    const events = userEvent.setup();
    render(<ProductForm initial={product({ features: { vi: ["A", "B", "C"], en: ["a"] } })} />);
    await events.type(screen.getAllByLabelText(/^Tiếng Việt/)[0], "!");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writeBodies()).toHaveLength(1));
    expect(writeBodies()[0]).toMatchObject({ features: { vi: ["A", "B", "C"], en: ["a"] } });
  });

  it("enables Lưu only while there are unsaved changes", async () => {
    const events = userEvent.setup();
    render(<ProductForm initial={product()} />);
    const save = () => screen.getByRole("button", { name: "Lưu" });
    expect(save()).toBeDisabled();
    await events.type(screen.getAllByLabelText(/^Tiếng Việt/)[0], "!");
    expect(save()).toBeEnabled();
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") throw new AdminApiError(500, "Lỗi máy chủ.");
      return undefined;
    });
    await events.click(save());
    await screen.findByRole("alert");
    expect(save()).toBeEnabled();
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) =>
      path.startsWith("/admin/media")
        ? []
        : init?.method === "PUT"
          ? product({ name: { vi: "Gạo ST25!", en: "ST25 rice" } })
          : undefined,
    );
    await events.click(save());
    await waitFor(() => expect(save()).toBeDisabled());
  });

  it("keeps text typed while a save runs, and leaves it unsaved", async () => {
    const events = userEvent.setup();
    let finish: (value: ProductAdminDto) => void = () => undefined;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") return new Promise<ProductAdminDto>((resolve) => (finish = resolve));
      return undefined;
    });
    render(<ProductForm initial={product()} />);
    const [nameVi] = screen.getAllByLabelText(/^Tiếng Việt/);
    const [nameEn] = screen.getAllByLabelText(/^English/);
    await events.type(nameVi, " mới");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writeBodies()).toHaveLength(1));
    await events.type(nameEn, " new");
    await act(async () => finish(product({ name: { vi: "Gạo ST25 mới", en: "ST25 rice" } })));
    expect(nameVi).toHaveValue("Gạo ST25 mới");
    expect(nameEn).toHaveValue("ST25 rice new");
    expect(screen.getByRole("button", { name: "Lưu" })).toBeEnabled();
  });

  it("shows what the API stored when nothing was typed during the save", async () => {
    const events = userEvent.setup();
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "PUT") return product({ name: { vi: "Gạo ST25 mới", en: "ST25 rice" } });
      return undefined;
    });
    render(<ProductForm initial={product()} />);
    const [nameVi] = screen.getAllByLabelText(/^Tiếng Việt/);
    await events.type(nameVi, " mới  ");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(nameVi).toHaveValue("Gạo ST25 mới"));
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
  });

  it("makes the fields read-only while a new product is being created", async () => {
    const events = userEvent.setup();
    let finish: (value: ProductAdminDto) => void = () => undefined;
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "POST") return new Promise<ProductAdminDto>((resolve) => (finish = resolve));
      return undefined;
    });
    render(<ProductForm />);
    const [nameVi] = screen.getAllByLabelText(/^Tiếng Việt/);
    await events.type(nameVi, "Gạo mới");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(writeBodies()).toHaveLength(1));
    expect(nameVi).toBeDisabled();
    expect(screen.getByRole("button", { name: "Thêm đặc điểm" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Chọn ảnh" })).toBeDisabled();
    await events.type(nameVi, "xyz");
    expect(nameVi).toHaveValue("Gạo mới");
    await act(async () => finish(product({ id: 9 })));
    expect(replace).toHaveBeenCalledWith("/admin/san-pham/9");
  });

  it("can be edited again after a failed create", async () => {
    const events = userEvent.setup();
    adminFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (path.startsWith("/admin/media")) return [];
      if (init?.method === "POST") throw new AdminApiError(503, "Máy chủ đang bận.");
      return undefined;
    });
    render(<ProductForm />);
    const [nameVi] = screen.getAllByLabelText(/^Tiếng Việt/);
    await events.type(nameVi, "Gạo mới");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await screen.findByText("Máy chủ đang bận.");
    expect(nameVi).toBeEnabled();
  });

  it("stops asking before the page closes once a new product is created", async () => {
    const events = userEvent.setup();
    render(<ProductForm />);
    await events.type(screen.getAllByLabelText(/^Tiếng Việt/)[0], "Gạo mới");
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/admin/san-pham/7"));
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it("goes to the new product only after the back-button guard removed its history entry", async () => {
    const events = userEvent.setup();
    window.history.pushState({ page: "new-product" }, "");
    const statesAtReplace: unknown[] = [];
    replace.mockImplementation(() => statesAtReplace.push(window.history.state));
    render(
      <NavGuardProvider>
        <ProductForm />
      </NavGuardProvider>,
    );
    await events.type(screen.getAllByLabelText(/^Tiếng Việt/)[0], "Gạo mới");
    expect(window.history.state).not.toEqual({ page: "new-product" });
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await waitFor(() => expect(statesAtReplace).toEqual([{ page: "new-product" }]));
  });

  it("does not let a 31st image be added", async () => {
    const events = userEvent.setup();
    const ids = Array.from({ length: 30 }, (_, i) => i + 1);
    adminFetch.mockImplementation(async (path: string) =>
      path.startsWith("/admin/media") ? [media(31), media(1)] : undefined,
    );
    render(<ProductForm initial={product({ mediaIds: ids })} />);
    await events.click(screen.getByRole("button", { name: "Chọn ảnh" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Tối đa 30 ảnh")).toBeInTheDocument();
    await events.click(await within(dialog).findByAltText("Ảnh 31"));
    await events.click(within(dialog).getByRole("button", { name: "Xong" }));
    expect(screen.queryByRole("button", { name: "Bỏ ảnh Ảnh 31" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Bỏ ảnh/ })).toHaveLength(30);
  });
});

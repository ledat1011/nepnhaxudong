import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "@/lib/admin/errors";
import type { ProductAdminDto } from "@/lib/admin/types";

const { adminFetch, requireReLogin, toastSuccess } = vi.hoisted(() => ({
  adminFetch: vi.fn(),
  requireReLogin: vi.fn(),
  toastSuccess: vi.fn(),
}));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));

import { VisibilitySwitch } from "./VisibilitySwitch";

function product(over: Partial<ProductAdminDto> = {}): ProductAdminDto {
  return {
    id: 4,
    sortOrder: 0,
    showPrice: false,
    visible: false,
    name: { vi: "Nếp cái", en: "Sticky rice" },
    description: { vi: null, en: null },
    features: { vi: ["Dẻo"], en: ["Soft"] },
    cookingTips: { vi: null, en: null },
    packagings: [{ weightGrams: 1000, priceVnd: null, sortOrder: 0 }],
    mediaIds: [],
    missingEn: false,
    ...over,
  };
}

beforeEach(() => {
  adminFetch.mockReset();
  toastSuccess.mockReset();
});

describe("VisibilitySwitch", () => {
  it("opens the check panel first and shows the product on Vẫn hiện", async () => {
    const events = userEvent.setup();
    const onChanged = vi.fn();
    adminFetch.mockResolvedValue(product({ visible: true }));
    render(<VisibilitySwitch product={product()} onChanged={onChanged} onFix={vi.fn()} />);
    const toggle = screen.getByRole("switch", { name: "Hiện trên web" });
    expect(toggle).not.toBeChecked();

    await events.click(toggle);

    const panel = screen.getByRole("alertdialog", { name: "Kiểm tra trước khi hiện trên web" });
    expect(within(panel).getByText("Chưa có ảnh")).toBeInTheDocument();
    expect(within(panel).getByText("Có bản tiếng Anh")).toBeInTheDocument();
    expect(within(panel).getByText("Có quy cách đóng gói")).toBeInTheDocument();
    expect(adminFetch).not.toHaveBeenCalled();
    expect(toggle).not.toBeChecked();

    await events.click(within(panel).getByRole("button", { name: "Vẫn hiện" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(product({ visible: true })));
    expect(adminFetch).toHaveBeenCalledWith("/admin/products/4/show", { method: "POST" });
    expect(toastSuccess).toHaveBeenCalledWith("Đã hiện sản phẩm trên web.");
  });

  it("offers Hiện trên web and Để sau when nothing is missing", async () => {
    const events = userEvent.setup();
    render(<VisibilitySwitch product={product({ mediaIds: [1] })} onChanged={vi.fn()} onFix={vi.fn()} />);
    await events.click(screen.getByRole("switch", { name: "Hiện trên web" }));
    const panel = screen.getByRole("alertdialog");
    expect(within(panel).getByText("Sản phẩm đã đủ các phần dưới đây.")).toBeInTheDocument();
    expect(within(panel).getByRole("button", { name: "Hiện trên web" })).toBeInTheDocument();
    await events.click(within(panel).getByRole("button", { name: "Để sau" }));
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it("goes back to the first gap on Quay lại sửa without changing anything", async () => {
    const events = userEvent.setup();
    const onFix = vi.fn();
    render(<VisibilitySwitch product={product({ name: { vi: "Nếp", en: null }, missingEn: true })} onChanged={vi.fn()} onFix={onFix} />);
    await events.click(screen.getByRole("switch", { name: "Hiện trên web" }));
    await events.click(screen.getByRole("button", { name: "Quay lại sửa" }));
    await waitFor(() => expect(onFix).toHaveBeenCalledWith("product.images"));
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it("asks before hiding and hides on Ẩn sản phẩm", async () => {
    const events = userEvent.setup();
    const onChanged = vi.fn();
    adminFetch.mockResolvedValue(product({ visible: false }));
    render(<VisibilitySwitch product={product({ visible: true })} onChanged={onChanged} onFix={vi.fn()} />);
    const toggle = screen.getByRole("switch", { name: "Hiện trên web" });
    expect(toggle).toBeChecked();

    await events.click(toggle);
    const question = screen.getByRole("alertdialog", { name: "Ẩn sản phẩm khỏi website?" });
    await events.click(within(question).getByRole("button", { name: "Ẩn sản phẩm" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledWith(product({ visible: false })));
    expect(adminFetch).toHaveBeenCalledWith("/admin/products/4/hide", { method: "POST" });
  });

  it("keeps the product shown on Không ẩn", async () => {
    const events = userEvent.setup();
    render(<VisibilitySwitch product={product({ visible: true })} onChanged={vi.fn()} onFix={vi.fn()} />);
    await events.click(screen.getByRole("switch", { name: "Hiện trên web" }));
    await events.click(screen.getByRole("button", { name: "Không ẩn" }));
    expect(adminFetch).not.toHaveBeenCalled();
    expect(screen.getByRole("switch", { name: "Hiện trên web" })).toBeChecked();
  });

  it("shows the API error and leaves the switch as it was", async () => {
    const events = userEvent.setup();
    const onChanged = vi.fn();
    adminFetch.mockRejectedValue(new AdminApiError(404, "Không tìm thấy sản phẩm."));
    render(<VisibilitySwitch product={product({ mediaIds: [1] })} onChanged={onChanged} onFix={vi.fn()} />);
    await events.click(screen.getByRole("switch", { name: "Hiện trên web" }));
    await events.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Hiện trên web" }));
    expect(await screen.findByText("Không tìm thấy sản phẩm.")).toBeInTheDocument();
    expect(onChanged).not.toHaveBeenCalled();
    expect(screen.getByRole("switch", { name: "Hiện trên web" })).not.toBeChecked();
  });

  it("can name the product for a list and be locked", () => {
    render(
      <VisibilitySwitch product={product()} label="Hiện trên web: Nếp cái" disabled onChanged={vi.fn()} onFix={vi.fn()} />,
    );
    expect(screen.getByRole("switch", { name: "Hiện trên web: Nếp cái" })).toBeDisabled();
    expect(screen.getByText("Hiện trên web")).toBeInTheDocument();
  });
});

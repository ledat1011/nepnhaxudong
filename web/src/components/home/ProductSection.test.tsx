import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Product } from "@/lib/content/types";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { ProductSection } from "./ProductSection";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

const dict = getDictionary("vi");

const PRODUCT: Product = {
  name: "[MẪU] Gạo nếp",
  description: "[MẪU] Mô tả sản phẩm",
  features: ["[MẪU] Tròn mẩy", "[MẪU] Dẻo", "[MẪU] Thơm"],
  cookingTips: "[MẪU] Ngâm nếp 6 tiếng",
  showPrice: false,
  packagings: [
    { weightGrams: 1000, priceVnd: null },
    { weightGrams: 500, priceVnd: 180000 },
  ],
  images: [],
};

function renderProduct(product: Product = PRODUCT) {
  return render(<ProductSection lang="vi" dict={dict} product={product} />);
}

describe("ProductSection", () => {
  it("shows the name, description, features and cooking tips", () => {
    renderProduct();
    expect(screen.getByRole("heading", { name: "[MẪU] Gạo nếp" })).toBeInTheDocument();
    expect(screen.getByText("[MẪU] Mô tả sản phẩm")).toBeInTheDocument();
    for (const feature of PRODUCT.features) {
      expect(screen.getByText(feature)).toBeInTheDocument();
    }
    expect(screen.getByText("[MẪU] Ngâm nếp 6 tiếng")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: dict.product.dishes })).toBeInTheDocument();
  });

  it("gives each feature an icon that screen readers skip", () => {
    const { container } = renderProduct();
    expect(container.querySelectorAll("li svg[aria-hidden='true']")).toHaveLength(3);
  });

  it("shows 'contact for price' and no currency when prices are hidden", () => {
    const { container } = renderProduct({ ...PRODUCT, showPrice: false });
    expect(screen.getAllByText(dict.product.contactPrice)).toHaveLength(2);
    expect(container.textContent).not.toContain("₫");
  });

  it("shows the price when prices are shown and set", () => {
    renderProduct({ ...PRODUCT, showPrice: true });
    expect(screen.getByText(/180\.000/)).toBeInTheDocument();
    // The packaging without a price still says to contact.
    expect(screen.getAllByText(dict.product.contactPrice)).toHaveLength(1);
  });

  it("shows each weight", () => {
    renderProduct();
    expect(screen.getByText("1 kg")).toBeInTheDocument();
    expect(screen.getByText("500 g")).toBeInTheDocument();
  });

  it("hides the packaging block when there is no packaging", () => {
    renderProduct({ ...PRODUCT, packagings: [] });
    expect(screen.queryByRole("heading", { name: dict.product.packaging })).not.toBeInTheDocument();
  });

  it("renders the product as an article with a placeholder when it has no images", () => {
    renderProduct();
    expect(screen.getByRole("article")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: dict.image.placeholder })).toBeInTheDocument();
  });

  it("passes gallery image sources ready for the browser", () => {
    renderProduct({
      ...PRODUCT,
      images: [{ url: "https://cdn.example.com/a.webp", width: 800, height: 600, alt: "Hạt nếp" }],
    });
    expect(
      screen.getByRole("button", { name: dict.gallery.viewLarge }).querySelector("img"),
    ).toHaveAttribute("src", "https://cdn.example.com/a.webp");
  });
});

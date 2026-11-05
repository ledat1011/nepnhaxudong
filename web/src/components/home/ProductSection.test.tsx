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

function renderProduct(product: Product = PRODUCT, showBag = false) {
  return render(<ProductSection lang="vi" dict={dict} product={product} showBag={showBag} />);
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

  it("shows the icon of each of the spec's three features: round, soft, fragrant", () => {
    renderProduct();
    const icons = PRODUCT.features.map(
      (feature) => screen.getByText(feature).closest("li")?.querySelector("svg")?.dataset.icon,
    );
    expect(icons).toEqual(["round", "soft", "fragrant"]);
  });

  it("gives a feature after the third no icon, not a repeated one, and keeps it aligned", () => {
    const extra = "[MẪU] Đặc điểm thứ tư";
    renderProduct({ ...PRODUCT, features: [...PRODUCT.features, extra] });
    const item = screen.getByText(extra).closest("li");
    expect(item?.querySelector("svg")).toBeNull();
    expect(item?.querySelector("[data-icon-space]")).not.toBeNull();
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

  it("renders a product with no images and no bag as one text column, with no image box", () => {
    renderProduct();
    const article = screen.getByRole("article");
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(article.children).toHaveLength(1);
    expect(article).not.toHaveClass("md:grid-cols-2");
  });

  it("keeps two columns when the product has photos", () => {
    renderProduct({
      ...PRODUCT,
      images: [{ url: "https://cdn.example.com/a.webp", width: 800, height: 600, alt: "Hạt nếp" }],
    });
    expect(screen.getByRole("article")).toHaveClass("md:grid-cols-2");
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

  it("shows the bag drawing in the gallery column, not next to the features, when asked", () => {
    const { container } = renderProduct(PRODUCT, true);
    const bag = container.querySelector("[data-product-bag]");
    const features = screen.getByRole("heading", { name: dict.product.features });
    expect(bag).not.toBeNull();
    const [galleryColumn, textColumn] = [...(container.querySelector("article")?.children ?? [])];
    expect(galleryColumn).toContainElement(bag as HTMLElement);
    expect(textColumn).toContainElement(features);
    expect(textColumn.querySelector("[data-product-bag]")).toBeNull();
    // The drawing takes the place of the empty photo placeholder.
    expect(screen.queryByRole("img", { name: dict.image.placeholder })).not.toBeInTheDocument();
  });

  it("shows no bag drawing when not asked", () => {
    const { container } = renderProduct(PRODUCT, false);
    expect(container.querySelector("[data-product-bag]")).toBeNull();
  });
});

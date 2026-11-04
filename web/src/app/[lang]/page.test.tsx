import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { HomeData, Product } from "@/lib/content/types";
import HomePage, { generateMetadata } from "./page";

vi.mock("next/image", () => ({
  // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
  default: (props: Record<string, unknown>) => <img {...props} />,
}));

// The motion code needs a real browser; this page test checks only the markup.
vi.mock("@/components/motion/HomeMotion", () => ({ HomeMotion: () => null }));

const product = (name: string): Product => ({
  name,
  description: "[MẪU] Mô tả",
  features: ["[MẪU] Tròn mẩy"],
  cookingTips: "",
  showPrice: false,
  packagings: [],
  images: [],
});

const home: HomeData = {
  lang: "vi",
  brand: { tagline: "t" },
  products: [product("[MẪU] Nếp cái hoa vàng"), product("[MẪU] Nếp thứ hai")],
  timeline: [],
  press: [],
  stories: [],
  contact: { phone: null, zalo: null, messenger: null, address: null, mapUrl: null, hours: null },
  social: { facebook: null, youtube: null, tiktok: null },
};

vi.mock("@/lib/content/client", () => ({
  getContentClient: () => ({ getHome: async () => home }),
}));

const params = (lang: string) => ({ params: Promise.resolve({ lang }) });

describe("home page metadata", () => {
  it("uses the same title separator as the other pages", async () => {
    expect((await generateMetadata(params("vi"))).title).toBe("Nếp Nhà | Gạo nếp cái hoa vàng");
    expect((await generateMetadata(params("en"))).title).toBe(
      "Nếp Nhà | Yellow-flower sticky rice",
    );
  });

  it("has no metadata for an unknown language", async () => {
    expect(await generateMetadata(params("fr"))).toEqual({});
  });
});

describe("home page products", () => {
  it("shows the bag drawing with the first product only", async () => {
    const { container } = render(await HomePage(params("vi")));
    const articles = container.querySelectorAll("article");
    expect(articles).toHaveLength(2);
    expect(articles[0].querySelectorAll("[data-product-bag]")).toHaveLength(1);
    expect(articles[1].querySelector("[data-product-bag]")).toBeNull();
    expect(container.querySelectorAll("[data-product-bag]")).toHaveLength(1);
  });
});

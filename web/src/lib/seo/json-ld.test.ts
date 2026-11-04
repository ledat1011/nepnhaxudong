import { describe, expect, it } from "vitest";
import type { HomeData, Product } from "@/lib/content/types";
import { buildHomeJsonLd, localBusinessJsonLd, productJsonLd, serializeJsonLd } from "./json-ld";

const SITE = new URL("https://x.vn");

const product: Product = {
  name: "Gạo nếp cái hoa vàng",
  description: "Nếp dẻo thơm",
  features: [],
  cookingTips: "",
  showPrice: false,
  packagings: [
    { weightGrams: 1000, priceVnd: 180000 },
    { weightGrams: 2000, priceVnd: 340000 },
  ],
  images: [],
};

const home: HomeData = {
  lang: "vi",
  brand: { tagline: "t" },
  products: [product],
  timeline: [],
  press: [],
  stories: [],
  contact: {
    phone: "0000 000 000",
    zalo: "0000 000 000",
    messenger: null,
    address: "Xứ Đông, Hải Dương",
    mapUrl: null,
    hours: null,
  },
  social: { facebook: "https://example.com/fb", youtube: null, tiktok: "https://example.com/tt" },
};

describe("productJsonLd", () => {
  it("describes the product and its brand", () => {
    const ld = productJsonLd(product, home, SITE);
    expect(ld).toMatchObject({
      "@type": "Product",
      name: "Gạo nếp cái hoa vàng",
      description: "Nếp dẻo thơm",
      brand: { "@type": "Brand", name: "Nếp Nhà" },
      url: "https://x.vn/vi",
    });
  });

  it("has no offers when the price is hidden", () => {
    expect(productJsonLd(product, home, SITE)).not.toHaveProperty("offers");
  });

  it("has an AggregateOffer for several priced packagings", () => {
    const ld = productJsonLd({ ...product, showPrice: true }, home, SITE);
    expect(ld).toMatchObject({
      offers: {
        "@type": "AggregateOffer",
        lowPrice: 180000,
        highPrice: 340000,
        offerCount: 2,
        priceCurrency: "VND",
      },
    });
  });

  it("has a single Offer for one priced packaging", () => {
    const one = { ...product, showPrice: true, packagings: [{ weightGrams: 1000, priceVnd: 180000 }] };
    expect(productJsonLd(one, home, SITE)).toMatchObject({
      offers: { "@type": "Offer", price: 180000, priceCurrency: "VND" },
    });
  });

  it("has no offers when no packaging has a price", () => {
    const none = { ...product, showPrice: true, packagings: [{ weightGrams: 1000, priceVnd: null }] };
    expect(productJsonLd(none, home, SITE)).not.toHaveProperty("offers");
  });

  it("makes a relative image URL absolute with the site URL", () => {
    const image = { url: "/media/a.webp", width: 10, height: 10, alt: "a" };
    expect(productJsonLd({ ...product, images: [image] }, home, SITE)).toMatchObject({
      image: "https://x.vn/media/a.webp",
    });
  });

  it("keeps an absolute image URL", () => {
    const image = { url: "https://cdn.example.com/a.webp", width: 10, height: 10, alt: "a" };
    expect(productJsonLd({ ...product, images: [image] }, home, SITE)).toMatchObject({
      image: "https://cdn.example.com/a.webp",
    });
  });

  it("has no image property without images", () => {
    expect(productJsonLd(product, home, SITE)).not.toHaveProperty("image");
  });
});

describe("localBusinessJsonLd", () => {
  it("describes the business", () => {
    expect(localBusinessJsonLd(home, SITE)).toMatchObject({
      "@type": "LocalBusiness",
      name: "Nếp Nhà",
      url: "https://x.vn/vi",
      telephone: "0000 000 000",
      address: { "@type": "PostalAddress", streetAddress: "Xứ Đông, Hải Dương", addressCountry: "VN" },
    });
  });

  it("lists only social links that exist", () => {
    expect(localBusinessJsonLd(home, SITE)).toMatchObject({
      sameAs: ["https://example.com/fb", "https://example.com/tt"],
    });
  });

  it("leaves out telephone, address and sameAs when there are none", () => {
    const bare: HomeData = {
      ...home,
      contact: { ...home.contact, phone: null, address: null },
      social: { facebook: null, youtube: null, tiktok: null },
    };
    const ld = localBusinessJsonLd(bare, SITE);
    expect(ld).not.toHaveProperty("telephone");
    expect(ld).not.toHaveProperty("address");
    expect(ld).not.toHaveProperty("sameAs");
  });
});

describe("buildHomeJsonLd", () => {
  it("puts every product and the business in one graph", () => {
    const ld = buildHomeJsonLd(home, SITE);
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@graph"].map((item) => item["@type"])).toEqual(["Product", "LocalBusiness"]);
  });
});

describe("serializeJsonLd", () => {
  it("escapes < so a name cannot close the script tag", () => {
    const text = serializeJsonLd({ name: "</script><script>alert(1)</script>" });
    expect(text).not.toContain("<");
    expect(text).toContain("\\u003c/script>");
    expect(JSON.parse(text)).toEqual({ name: "</script><script>alert(1)</script>" });
  });
});

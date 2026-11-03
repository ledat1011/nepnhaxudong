import { toImageSrc } from "@/lib/content/image-src";
import type { HomeData, Product } from "@/lib/content/types";
import { homePath } from "@/lib/i18n/routes";
import { SITE_NAME } from "./metadata";

const CURRENCY = "VND";
const COUNTRY = "VN";

type JsonLdNode = { "@type": string } & Record<string, unknown>;

function offersOf(product: Product): JsonLdNode | null {
  if (!product.showPrice) return null;
  const prices = product.packagings
    .map((packaging) => packaging.priceVnd)
    .filter((price): price is number => price !== null);
  if (prices.length === 0) return null;
  if (prices.length === 1) {
    return { "@type": "Offer", priceCurrency: CURRENCY, price: prices[0] };
  }
  return {
    "@type": "AggregateOffer",
    priceCurrency: CURRENCY,
    lowPrice: Math.min(...prices),
    highPrice: Math.max(...prices),
    offerCount: prices.length,
  };
}

export function productJsonLd(product: Product, home: HomeData, siteUrl: URL): JsonLdNode {
  const [firstImage] = product.images;
  const offers = offersOf(product);
  return {
    "@type": "Product",
    name: product.name,
    description: product.description,
    brand: { "@type": "Brand", name: SITE_NAME },
    url: new URL(homePath(home.lang), siteUrl).href,
    ...(firstImage && { image: toImageSrc(firstImage.url, siteUrl.href) }),
    ...(offers && { offers }),
  };
}

export function localBusinessJsonLd(home: HomeData, siteUrl: URL): JsonLdNode {
  const { phone, address } = home.contact;
  const sameAs = Object.values(home.social).filter((link): link is string => link !== null);
  return {
    "@type": "LocalBusiness",
    name: SITE_NAME,
    url: new URL(homePath(home.lang), siteUrl).href,
    ...(phone && { telephone: phone }),
    ...(address && {
      address: { "@type": "PostalAddress", streetAddress: address, addressCountry: COUNTRY },
    }),
    ...(sameAs.length > 0 && { sameAs }),
  };
}

export function buildHomeJsonLd(home: HomeData, siteUrl: URL) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      ...home.products.map((product) => productJsonLd(product, home, siteUrl)),
      localBusinessJsonLd(home, siteUrl),
    ],
  };
}

/** JSON for a `<script type="application/ld+json">`: `<` is escaped so no text can close the tag. */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

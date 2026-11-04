import { describe, expect, it } from "vitest";
import { buildMetadata, getSiteUrl, withSiteName } from "./metadata";

const PATHS = { vi: "/vi", en: "/en" };

describe("getSiteUrl", () => {
  it("defaults to localhost", () => {
    expect(getSiteUrl({}).href).toBe("http://localhost:3000/");
  });

  it("reads SITE_URL", () => {
    expect(getSiteUrl({ SITE_URL: "https://nepnha.vn" }).href).toBe("https://nepnha.vn/");
  });
});

describe("withSiteName", () => {
  it("adds the site name after the title", () => {
    expect(withSiteName("Câu chuyện")).toBe("Câu chuyện | Nếp Nhà");
  });
});

describe("buildMetadata", () => {
  it("sets the canonical path of the current language", () => {
    const metadata = buildMetadata({ lang: "en", title: "t", description: "d", paths: PATHS });
    expect(metadata.alternates?.canonical).toBe("/en");
  });

  it("lists both languages and x-default (vi) as alternates", () => {
    const metadata = buildMetadata({ lang: "en", title: "t", description: "d", paths: PATHS });
    expect(metadata.alternates?.languages).toEqual({
      vi: "/vi",
      en: "/en",
      "x-default": "/vi",
    });
  });

  it("sets the Open Graph locale, alternate locale, site name and type", () => {
    const en = buildMetadata({ lang: "en", title: "t", description: "d", paths: PATHS });
    expect(en.openGraph).toMatchObject({
      locale: "en_US",
      alternateLocale: ["vi_VN"],
      siteName: "Nếp Nhà",
      type: "website",
      title: "t",
      description: "d",
      url: "/en",
    });
    const vi = buildMetadata({ lang: "vi", title: "t", description: "d", paths: PATHS });
    expect(vi.openGraph).toMatchObject({ locale: "vi_VN", alternateLocale: ["en_US"] });
  });

  it("builds an article with its published time", () => {
    const metadata = buildMetadata({
      lang: "vi",
      title: "t",
      description: "d",
      paths: { vi: "/vi/cau-chuyen/a", en: "/en/stories/a" },
      type: "article",
      publishedTime: "2026-04-10T02:00:00Z",
    });
    expect(metadata.openGraph).toMatchObject({
      type: "article",
      publishedTime: "2026-04-10T02:00:00Z",
    });
  });

  it("sets title and description", () => {
    const metadata = buildMetadata({ lang: "vi", title: "Tiêu đề", description: "Mô tả", paths: PATHS });
    expect(metadata.title).toBe("Tiêu đề");
    expect(metadata.description).toBe("Mô tả");
  });
});

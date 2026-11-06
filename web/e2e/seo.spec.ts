import { expect, test } from "@playwright/test";
import { origin, TARGETS } from "./targets.mjs";

const ORIGIN = origin(TARGETS.mock.port);

type JsonLdNode = { "@type"?: string };

test.describe("page metadata", () => {
  test("home has canonical, hreflang and JSON-LD", async ({ page }) => {
    await page.goto("/vi");
    await expect(page.locator("link[rel=canonical]")).toHaveAttribute("href", `${ORIGIN}/vi`);
    await expect(page.locator("link[rel=alternate][hreflang=en]")).toHaveAttribute(
      "href",
      `${ORIGIN}/en`,
    );
    await expect(page.locator("link[rel=alternate][hreflang=x-default]")).toHaveAttribute(
      "href",
      `${ORIGIN}/vi`,
    );

    const raw = await page.locator('script[type="application/ld+json"]').allTextContents();
    expect(raw.length).toBeGreaterThan(0);
    const nodes = raw.flatMap((text): JsonLdNode[] => {
      const data = JSON.parse(text);
      return Array.isArray(data["@graph"]) ? data["@graph"] : [data];
    });
    const types = nodes.map((node) => node["@type"]);
    expect(types).toContain("Product");
    expect(types).toContain("LocalBusiness");
  });

  test("the share image of each language is a 1200 x 630 PNG", async ({ page, request }) => {
    for (const lang of ["vi", "en"]) {
      await page.goto(`/${lang}`);
      const imageUrl = await page.locator('meta[property="og:image"]').getAttribute("content");
      expect(imageUrl, lang).not.toBeNull();
      await expect(page.locator('meta[property="og:image:width"]')).toHaveAttribute("content", "1200");
      await expect(page.locator('meta[property="og:image:height"]')).toHaveAttribute("content", "630");
      const response = await request.get(new URL(imageUrl!).pathname);
      expect(response.status(), lang).toBe(200);
      expect(response.headers()["content-type"], lang).toBe("image/png");
      // A PNG file starts with these 8 bytes.
      expect([...(await response.body()).subarray(0, 8)], lang).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    }
  });

  test("a story links to its own translation, or to the shared slug", async ({ page }) => {
    await page.goto("/vi/cau-chuyen/tu-cua-hang-vat-tu-toi-bich-gao");
    await expect(page.locator("link[rel=alternate][hreflang=en]")).toHaveAttribute(
      "href",
      `${ORIGIN}/en/stories/from-farm-shop-to-rice-bag`,
    );
    await expect(page.locator("link[rel=alternate][hreflang=x-default]")).toHaveAttribute(
      "href",
      `${ORIGIN}/vi/cau-chuyen/tu-cua-hang-vat-tu-toi-bich-gao`,
    );

    await page.goto("/vi/cau-chuyen/nep-cai-hoa-vang-len-truyen-hinh");
    await expect(page.locator("link[rel=alternate][hreflang=en]")).toHaveAttribute(
      "href",
      `${ORIGIN}/en/stories/nep-cai-hoa-vang-len-truyen-hinh`,
    );
  });
});

test.describe("robots and sitemap", () => {
  test("robots.txt keeps crawlers out of /admin", async ({ request }) => {
    const response = await request.get("/robots.txt");
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain("Disallow: /admin");
  });

  test("sitemap.xml lists the English stories page", async ({ request }) => {
    const response = await request.get("/sitemap.xml");
    expect(response.ok()).toBe(true);
    expect(await response.text()).toContain(`${ORIGIN}/en/stories`);
  });
});

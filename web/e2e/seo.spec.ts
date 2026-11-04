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

  test("a story links to its own translation, or to the shared slug", async ({ page }) => {
    await page.goto("/vi/cau-chuyen/mua-gat-dau-tien-o-xu-dong");
    await expect(page.locator("link[rel=alternate][hreflang=en]")).toHaveAttribute(
      "href",
      `${ORIGIN}/en/stories/first-harvest-in-xu-dong`,
    );
    await expect(page.locator("link[rel=alternate][hreflang=x-default]")).toHaveAttribute(
      "href",
      `${ORIGIN}/vi/cau-chuyen/mua-gat-dau-tien-o-xu-dong`,
    );

    await page.goto("/vi/cau-chuyen/chuyen-nha-nep-xu-dong");
    await expect(page.locator("link[rel=alternate][hreflang=en]")).toHaveAttribute(
      "href",
      `${ORIGIN}/en/stories/chuyen-nha-nep-xu-dong`,
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

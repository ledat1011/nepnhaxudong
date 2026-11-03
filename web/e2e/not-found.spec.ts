import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const VI_TITLE = "Không tìm thấy trang";
const EN_TITLE = "Page not found";

// Paths no page serves: the proxy answers them with the 404 page before any rendering,
// so the title and the text are in the HTML the server sends.
const JUNK_PATHS = ["/fr", "/wp-login.php", "/vi/stories", "/a/b/c/d"];

test.describe("404 page in the server HTML", () => {
  for (const path of JUNK_PATHS) {
    test(`${path} is a 404 with a title and both languages`, async ({ request }) => {
      const response = await request.get(path);
      expect(response.status()).toBe(404);
      const html = await response.text();
      expect(html).toMatch(/<title>[^<]+<\/title>/);
      expect(html).toContain(VI_TITLE);
      expect(html).toContain(EN_TITLE);
      expect(html).toContain('lang="en"');
      expect(html).toContain('name="robots" content="noindex"');
    });
  }

  test("has exactly one h1, with its own lang on each language block", async ({ page }) => {
    await page.goto("/fr");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(VI_TITLE);
    await expect(page.locator('section[lang="vi"]')).toHaveCount(1);
    await expect(page.locator('section[lang="en"]')).toHaveCount(1);
  });
});

test.describe("404 pages pass accessibility checks", () => {
  // /vi/cau-chuyen/khong-co is a story that does not exist: only the page knows it,
  // so Next shows its 404 in the browser after the page loads.
  for (const path of ["/fr", "/vi/cau-chuyen/khong-co"]) {
    test(`${path}: status 404, a title and no WCAG 2 A/AA violations`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(VI_TITLE);
      expect(await page.title()).not.toBe("");
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

test.describe("the proxy lets real paths through", () => {
  for (const path of ["/vi", "/en", "/robots.txt", "/sitemap.xml", "/icon.svg"]) {
    test(`${path} is 200`, async ({ request }) => {
      expect((await request.get(path)).status()).toBe(200);
    });
  }

  test("a /_next/static asset is 200", async ({ page, request }) => {
    await page.goto("/vi");
    const src = await page
      .locator('script[src^="/_next/static/"]')
      .first()
      .getAttribute("src");
    expect(src).not.toBeNull();
    expect((await request.get(src as string)).status()).toBe(200);
  });
});

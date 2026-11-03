import { expect, test } from "@playwright/test";
import { getDictionary } from "../src/lib/i18n/dictionaries";

const vi = getDictionary("vi");
const NARROW = { width: 320, height: 640 };
const PHONE = { width: 375, height: 812 };

test.describe("language redirect from /", () => {
  test("an English browser lands on /en", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, locale: "en-US" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/en$/);
    await context.close();
  });

  test("a Vietnamese browser lands on /vi", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, locale: "vi-VN" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/vi$/);
    await context.close();
  });

  test("no Accept-Language header redirects to /vi and varies on the header", async ({
    request,
  }) => {
    const response = await request.get("/", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers()["location"], response.url()).pathname).toBe("/vi");
    expect(response.headers()["vary"]).toContain("Accept-Language");
  });
});

test.describe("home page", () => {
  test("shows the brand, sample content and the Zalo link", async ({ page }) => {
    await page.goto("/vi");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nếp Nhà");
    await expect(page.getByText("[MẪU]").first()).toBeVisible();
    await expect(page.locator('a[href="https://zalo.me/0000000000"]').first()).toBeVisible();
  });

  test("the language switch goes to /en and sets html lang", async ({ page }) => {
    await page.goto("/vi");
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await page.getByRole("link", { name: "English", exact: true }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("an unknown language is a 404", async ({ page }) => {
    const response = await page.goto("/fr");
    expect(response?.status()).toBe(404);
  });

  test("reduced motion turns smooth scrolling off", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto("/vi");
    const behavior = await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    );
    expect(behavior).toBe("auto");
    await context.close();
  });
});

test.describe("mobile menu at 375x812", () => {
  test.use({ viewport: PHONE });

  test("opens, scrolls to the contact section and closes", async ({ page }) => {
    await page.goto("/vi");
    const button = page.getByRole("button", { name: vi.nav.openMenu });
    await expect(button).toHaveAttribute("aria-expanded", "false");

    await button.click();
    const menu = page.getByRole("navigation", { name: vi.nav.label });
    await expect(page.getByRole("button", { name: vi.nav.closeMenu })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await menu.getByRole("link", { name: vi.nav.contact, exact: true }).click();

    await expect(page).toHaveURL(/#lien-he$/);
    await expect(page.locator("#lien-he")).toBeInViewport();
    await expect(page.getByRole("button", { name: vi.nav.openMenu })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("the close button closes the menu", async ({ page }) => {
    await page.goto("/vi");
    await page.getByRole("button", { name: vi.nav.openMenu }).click();
    await expect(page.getByRole("link", { name: vi.nav.product, exact: true })).toBeVisible();
    await page.getByRole("button", { name: vi.nav.closeMenu }).click();
    await expect(page.getByRole("link", { name: vi.nav.product, exact: true })).toBeHidden();
  });
});

test.describe("no horizontal scroll at 320x640", () => {
  test.use({ viewport: NARROW });

  const paths = [
    "/vi",
    "/en",
    "/vi/cau-chuyen/bao-quan-gao-nep-dung-cach",
    "/en/stories/storing-sticky-rice-the-right-way",
  ];

  for (const path of paths) {
    test(path, async ({ page }) => {
      await page.goto(path);
      const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    });
  }
});

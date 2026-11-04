import { expect, test, type Page } from "@playwright/test";
import { getDictionary } from "../src/lib/i18n/dictionaries";

const vi = getDictionary("vi");
const BAR = "[data-navigation-progress]";
const STORY_SLUG = "mua-gat-dau-tien-o-xu-dong";
const STORY_TITLE = "[MẪU] Mùa gặt đầu tiên ở xứ Đông";

/** Records whether the loading bar is ever added to the page from now on. */
async function watchForBar(page: Page) {
  await page.evaluate((selector) => {
    const w = window as typeof window & { barSeen?: boolean };
    w.barSeen = document.querySelector(selector) !== null;
    new MutationObserver(() => {
      if (document.querySelector(selector)) w.barSeen = true;
    }).observe(document.body, { childList: true, subtree: true });
  }, BAR);
}

const barSeen = (page: Page) =>
  page.evaluate(() => (window as typeof window & { barSeen?: boolean }).barSeen === true);

test.describe("page loading bar", () => {
  test("does not appear on a fast navigation", async ({ page }) => {
    // The home page is rendered once and cached, and the logo link prefetches it.
    await page.goto("/vi");
    await page.goto("/vi/cau-chuyen");
    await page.waitForLoadState("networkidle");
    await watchForBar(page);
    await page.getByRole("banner").getByRole("link", { name: vi.site.name }).click();
    await expect(page).toHaveURL(/\/vi$/);
    await expect(page.getByRole("heading", { level: 1, name: vi.site.name })).toBeVisible();
    expect(await barSeen(page)).toBe(false);
  });

  test("appears on a slow navigation, on the top edge, without moving the page", async ({
    page,
  }) => {
    await page.goto("/vi/cau-chuyen");
    await page.waitForLoadState("networkidle");
    // Every request for the story page waits 1.5 s, so the navigation is slow.
    await page.route(`**/vi/cau-chuyen/${STORY_SLUG}*`, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      await route.continue();
    });
    const titleTop = await page.getByRole("heading", { level: 1 }).evaluate(
      (el) => el.getBoundingClientRect().top,
    );
    await page.getByRole("link", { name: STORY_TITLE }).click();

    const bar = page.locator(BAR);
    await expect(bar).toBeVisible();
    expect(await bar.getAttribute("aria-hidden")).toBe("true");
    const box = await bar.boundingBox();
    expect(box?.y).toBe(0);
    expect(await bar.evaluate((el) => getComputedStyle(el).position)).toBe("fixed");
    // The bar takes no layout space: the page under it did not move.
    const titleTopWhileWaiting = await page.getByRole("heading", { level: 1 }).evaluate(
      (el) => el.getBoundingClientRect().top,
    );
    expect(titleTopWhileWaiting).toBe(titleTop);

    await expect(page).toHaveURL(new RegExp(`/vi/cau-chuyen/${STORY_SLUG}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(STORY_TITLE);
    await expect(bar).toHaveCount(0);
  });
});

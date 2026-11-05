import { expect, test } from "@playwright/test";
import { getDictionary } from "../src/lib/i18n/dictionaries";

const vi = getDictionary("vi");
const en = getDictionary("en");
const VI_STORY = "/vi/cau-chuyen/mua-gat-dau-tien-o-xu-dong";
const IMAGE_BOXES = "[data-journey-photo], [data-press-photo], [data-story-cover]";

test.describe("blocks without an image", () => {
  // The sample content has no photos at all.
  for (const path of ["/vi", "/vi/cau-chuyen", VI_STORY]) {
    test(`${path} draws no empty image box`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main").getByRole("img", { name: vi.image.placeholder })).toHaveCount(0);
      await expect(page.locator(IMAGE_BOXES)).toHaveCount(0);
    });
  }
});

test.describe("end of a story page", () => {
  test("invites the reader to message on Zalo and opens the Zalo panel", async ({ page }) => {
    await page.goto(VI_STORY);
    const invite = page.getByRole("complementary", { name: vi.invite.title });
    await expect(invite).toBeVisible();
    await invite.getByRole("link", { name: vi.invite.zalo }).click();
    await expect(page.getByRole("dialog", { name: vi.zalo.title })).toBeVisible();
  });

  test("offers Messenger next to Zalo on the English page", async ({ page }) => {
    await page.goto("/en/stories/first-harvest-in-xu-dong");
    const invite = page.getByRole("complementary", { name: en.invite.title });
    await expect(invite.getByRole("link", { name: en.invite.zalo })).toBeVisible();
    await expect(invite.getByRole("link", { name: new RegExp(en.invite.messenger) })).toHaveAttribute(
      "target",
      "_blank",
    );
  });
});

test.describe("first phone screen", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("says what is sold, and the top of the rice bag shows", async ({ page }) => {
    await page.goto("/vi");
    await expect(page.getByText(vi.hero.what)).toBeInViewport();
    const bagTop = await page
      .locator("[data-product-bag]")
      .evaluate((el) => el.getBoundingClientRect().top);
    expect(bagTop).toBeLessThan(812);
  });
});

test("the page has one shared loading status region", async ({ page }) => {
  await page.goto("/vi");
  await expect(page.getByRole("status")).toHaveCount(1);
});

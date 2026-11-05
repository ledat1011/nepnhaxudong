import { expect, test } from "@playwright/test";
import { getDictionary } from "../src/lib/i18n/dictionaries";

const vi = getDictionary("vi");

test("an image file that does not load shows the calm 'photo coming soon' box", async ({
  page,
}) => {
  await page.goto("/vi/cau-chuyen/e2e-anh-loi");
  const cover = page.locator("[data-story-cover]");
  await expect(cover.getByRole("img", { name: vi.image.placeholder })).toBeVisible();
  // No broken image icon: the <img> is gone from the cover box.
  await expect(cover.locator("img")).toHaveCount(0);
  await expect(cover).toBeVisible();
});

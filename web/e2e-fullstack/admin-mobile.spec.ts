import { expect, test } from "@playwright/test";
import { ADMIN_ROUTES } from "../src/lib/admin/routes";

const WIDTH = 375;
test.use({ viewport: { width: WIDTH, height: 812 } });

for (const [name, route] of Object.entries(ADMIN_ROUTES)) {
  test(`${name} (${route}) does not scroll sideways at ${WIDTH} px`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Đang tải")).toHaveCount(0);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(WIDTH);
  });
}

test("the save bar of the product form does not overlap the bottom navigation", async ({ page }) => {
  await page.goto(`${ADMIN_ROUTES.products}/moi`);
  const save = page.getByRole("button", { name: "Lưu", exact: true });
  const nav = page.getByRole("navigation", { name: "Menu chính" });
  await expect(save).toBeVisible();
  await expect(nav).toBeVisible();
  const saveBox = await save.boundingBox();
  const navBox = await nav.boundingBox();
  expect(saveBox).not.toBeNull();
  expect(navBox).not.toBeNull();
  // The button ends above the top edge of the navigation.
  expect(saveBox!.y + saveBox!.height).toBeLessThanOrEqual(navBox!.y);
});

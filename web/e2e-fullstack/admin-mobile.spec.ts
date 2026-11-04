import { expect, test, type Page } from "@playwright/test";
import { ADMIN_ROUTES } from "../src/lib/admin/routes";

const WIDTH = 375;
test.use({ viewport: { width: WIDTH, height: 812 } });

function pageScrollWidth(page: Page): Promise<number> {
  return page.evaluate(() => document.documentElement.scrollWidth);
}

// The press item and the address below were saved by admin-flow.spec.ts with long text (Review Focus 5).
test("the press list and the dialog of a press item with a 200-character link do not scroll sideways", async ({ page }) => {
  await page.goto(ADMIN_ROUTES.press);
  // Anchored: the move buttons of the row ("Đưa bài … lên") also contain the title.
  const row = page.getByRole("button", { name: /^\[E2E\] Bài báo/ }).first();
  await expect(row).toBeVisible();
  expect(await pageScrollWidth(page)).toBeLessThanOrEqual(WIDTH);

  await row.click();
  const form = page.getByRole("dialog", { name: "Sửa bài báo" });
  await expect(form).toBeVisible();
  await expect(form.getByLabel("Đường dẫn bài báo")).toHaveValue(/^https:\/\/baochi\.example\/.{150,}$/);
  expect(await pageScrollWidth(page)).toBeLessThanOrEqual(WIDTH);
  expect(await form.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
  const box = await form.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(WIDTH);
});

test("the contact tab with a long address does not scroll sideways", async ({ page }) => {
  await page.goto(ADMIN_ROUTES.settings);
  await page.getByRole("tab", { name: "Liên hệ" }).click();
  const address = page.getByRole("group", { name: /^Địa chỉ/ }).getByLabel("Tiếng Việt");
  await expect(address).toHaveValue(/^\[E2E\] .{150,}$/);
  expect(await pageScrollWidth(page)).toBeLessThanOrEqual(WIDTH);
});

for (const [name, route] of Object.entries(ADMIN_ROUTES)) {
  test(`${name} (${route}) does not scroll sideways at ${WIDTH} px`, async ({ browser, baseURL }) => {
    // The sign-in page redirects a signed-in user, so it is measured without the saved session.
    const signedOutPage = name === "login";
    const context = await browser.newContext({
      baseURL,
      viewport: { width: WIDTH, height: 812 },
      ...(signedOutPage ? { storageState: { cookies: [], origins: [] } } : { storageState: process.env.E2E_STATE_FILE }),
    });
    const page = await context.newPage();
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Đang tải")).toHaveCount(0);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(WIDTH);
    await context.close();
  });
}

test("a wrong Zalo number is shown under the Zalo box, and the screen moves there", async ({ page }) => {
  await page.goto(ADMIN_ROUTES.settings);
  const zalo = page.getByLabel("Zalo (chỉ số)");
  await zalo.fill("0912 345 67a");
  // Lưu sits at the bottom of the screen, below the address and the hours.
  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(zalo).toHaveAttribute("aria-invalid", "true");
  await expect(zalo).toBeFocused();
  await expect(zalo).toBeInViewport();
  await expect(zalo).toHaveAccessibleDescription(/^Số Zalo chỉ gồm chữ số/);
  await expect(page.getByRole("alert").filter({ hasText: "Chưa lưu. Hãy sửa ô có viền đỏ." })).toBeVisible();
  // Nothing was stored: dropping the change brings the saved number back.
  await page.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await page.getByRole("alertdialog", { name: "Bỏ thay đổi chưa lưu?" }).getByRole("button", { name: "Bỏ thay đổi" }).click();
  await expect(zalo).not.toHaveValue("0912 345 67a");
});

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

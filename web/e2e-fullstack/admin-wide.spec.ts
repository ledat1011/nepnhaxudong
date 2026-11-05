import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_ROUTES } from "../src/lib/admin/routes";

// A laptop. The checks project uses the session saved by admin-flow.spec.ts.
const WIDE = { width: 1280, height: 800 };
const PHONE = { width: 375, height: 812 };
/** The page column is 60rem (960 px); a pixel of rounding is allowed. */
const MAX_CONTENT = 961;

async function settled(page: Page) {
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Đang tải")).toHaveCount(0);
}

/** With E2E_SHOT_DIR set, saves a screenshot for the Delivery Gate review. Without it, does nothing. */
async function shot(page: Page, name: string) {
  const dir = process.env.E2E_SHOT_DIR;
  if (dir) await page.screenshot({ path: path.join(dir, `${name}.png`), fullPage: true });
}

test.describe("at 1280 px", () => {
  test.use({ viewport: WIDE });

  test("the left menu shows, the bottom menu does not, and the page is at most about 960 px wide", async ({ page }) => {
    await page.goto(ADMIN_ROUTES.home);
    await settled(page);
    const side = page.getByRole("navigation", { name: "Menu bên" });
    await expect(side).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Menu chính" })).toBeHidden();
    // Every screen is one click away, the account screen included (the saved session is the owner).
    await expect(side.getByRole("link", { name: "Tài khoản" })).toBeVisible();
    await expect(side.getByRole("link", { name: "Lịch sử" })).toBeVisible();

    const main = await page.locator("main").boundingBox();
    expect(main).not.toBeNull();
    expect(main!.width).toBeLessThanOrEqual(MAX_CONTENT);
    const menu = await side.boundingBox();
    // The page starts right of the menu, it does not run under it.
    expect(main!.x).toBeGreaterThanOrEqual(menu!.x + menu!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(WIDE.width);
    await shot(page, "1280-tong-quan");

    await side.getByRole("link", { name: "Liên hệ & cài đặt" }).click();
    await expect(page).toHaveURL(new RegExp(`${ADMIN_ROUTES.settings}$`));
    await settled(page);
    // Text boxes keep 16 px on a wide screen too.
    const box = page.getByRole("textbox").first();
    await expect(box).toHaveCSS("font-size", "16px");
    const formWidth = await page.locator("main").boundingBox();
    expect(formWidth!.width).toBeLessThanOrEqual(MAX_CONTENT);
    await shot(page, "1280-cai-dat");
  });

  test("the Lưu bar sits beside the left menu, not under it", async ({ page }) => {
    await page.goto(`${ADMIN_ROUTES.products}/moi`);
    const save = page.getByRole("button", { name: "Lưu", exact: true });
    await expect(save).toBeVisible();
    const menu = await page.getByRole("navigation", { name: "Menu bên" }).boundingBox();
    const button = await save.boundingBox();
    expect(button!.x).toBeGreaterThanOrEqual(menu!.x + menu!.width);
    await shot(page, "1280-san-pham-moi");
  });

  for (const [name, route] of Object.entries(ADMIN_ROUTES)) {
    if (["login", "changePassword", "setupTotp"].includes(name)) continue;
    test(`${name} (${route}) does not scroll sideways and keeps the page column`, async ({ page }) => {
      await page.goto(route);
      await settled(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(WIDE.width);
      const main = await page.locator("main").boundingBox();
      expect(main!.width).toBeLessThanOrEqual(MAX_CONTENT);
      await shot(page, `1280-${name}`);
    });
  }
});

test.describe("history", () => {
  test.use({ viewport: PHONE });

  test("a row of Thay đổi gần đây opens its history detail, and Back returns to Tổng quan", async ({ page }) => {
    await page.goto(ADMIN_ROUTES.home);
    const recent = page.getByRole("region", { name: "Thay đổi gần đây" });
    const first = recent.getByRole("listitem").first().getByRole("link");
    await expect(first).toBeVisible();
    const href = await first.getAttribute("href");
    expect(href).toMatch(/^\/admin\/lich-su\?mo=\d+$/);
    await first.click();
    await expect(page).toHaveURL(new RegExp(`${ADMIN_ROUTES.history}\\?mo=\\d+$`));
    await expect(page.getByRole("button", { name: "Quay lại danh sách" })).toBeVisible();
    // Field names are in Vietnamese: no code names such as "name.vi" or "sortOrder".
    const detail = page.locator("main");
    await expect(detail.getByRole("table").or(detail.getByText("Không có thay đổi nào."))).toBeVisible();
    await expect(detail).not.toContainText(/\b(sortOrder|name\.vi|title\.vi|value\.)/);
    await shot(page, "375-lich-su-chi-tiet");
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${ADMIN_ROUTES.home}$`));
  });

  test("the Back button closes an open history line and keeps the list", async ({ page }) => {
    await page.goto(ADMIN_ROUTES.history);
    await settled(page);
    await shot(page, "375-lich-su");
    await page.getByRole("list").getByRole("button").first().click();
    await expect(page).toHaveURL(/\?mo=\d+$/);
    await expect(page.getByRole("button", { name: "Quay lại danh sách" })).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(new RegExp(`${ADMIN_ROUTES.history}$`));
    await expect(page.getByLabel("Loại nội dung")).toBeVisible();
  });

  test("phone screens for the Delivery Gate", async ({ page }) => {
    test.skip(!process.env.E2E_SHOT_DIR, "screenshots only");
    for (const [name, route] of Object.entries(ADMIN_ROUTES)) {
      if (["login", "changePassword", "setupTotp"].includes(name)) continue;
      await page.goto(route);
      await settled(page);
      await shot(page, `375-${name}`);
    }
  });
});

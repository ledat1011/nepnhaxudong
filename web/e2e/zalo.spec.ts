import { expect, test, type Page } from "@playwright/test";
import { getDictionary } from "../src/lib/i18n/dictionaries";

const vi = getDictionary("vi");
const PHONE = { width: 375, height: 812 };
// The sample number in the mock content (src/fixtures/home.vi.json).
const ZALO_URL = "https://zalo.me/0967598629";

const headerZalo = (page: Page) =>
  page.getByRole("banner").getByRole("link", { name: vi.contact.zalo, exact: true });

test.describe("Zalo contact on a wide screen", () => {
  test("the header link opens a dialog with a QR code instead of leaving the page", async ({
    page,
  }) => {
    await page.goto("/vi");
    await headerZalo(page).click();
    const dialog = page.getByRole("dialog", { name: vi.zalo.title });
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/vi$/);
    await expect(dialog.getByRole("img", { name: vi.zalo.qrAlt })).toBeVisible();
    await expect(dialog).toContainText("0967 598 629");
    const open = dialog.getByRole("link", { name: new RegExp(vi.zalo.open) });
    await expect(open).toHaveAttribute("href", ZALO_URL);
    await expect(open).toHaveAttribute("target", "_blank");
  });

  test("Escape closes the dialog and focus goes back to the link", async ({ page }) => {
    await page.goto("/vi");
    const trigger = headerZalo(page);
    await trigger.focus();
    await page.keyboard.press("Enter");
    const dialog = page.getByRole("dialog", { name: vi.zalo.title });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("a click outside closes the dialog", async ({ page }) => {
    await page.goto("/vi");
    await headerZalo(page).click();
    const dialog = page.getByRole("dialog", { name: vi.zalo.title });
    await expect(dialog).toBeVisible();
    // A click outside in the first 400 ms is taken as the second click of a double click.
    await page.waitForTimeout(500);
    await page.mouse.click(10, 400);
    await expect(dialog).toBeHidden();
  });

  test("a double click opens the dialog and keeps it open", async ({ page }) => {
    await page.goto("/vi");
    await headerZalo(page).dblclick();
    const dialog = page.getByRole("dialog", { name: vi.zalo.title });
    await expect(dialog).toBeVisible();
    // Long enough for the second click to have closed it, without the guard.
    await page.waitForTimeout(500);
    await expect(dialog).toBeVisible();
    await expect(page).toHaveURL(/\/vi$/);
  });

  test("Copy number puts the digits on the clipboard and says so", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/vi");
    await headerZalo(page).click();
    await page.getByRole("button", { name: vi.zalo.copy }).click();
    await expect(page.getByRole("status").filter({ hasText: vi.zalo.copied })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe("0967598629");
  });
});

test.describe("Zalo contact in a narrow desktop window", () => {
  test.use({ viewport: { width: 600, height: 800 } });

  test("uses the sheet layout but keeps the QR code and a new tab", async ({ page }) => {
    await page.goto("/vi");
    await page.getByRole("link", { name: vi.hero.zaloCta }).click();
    const sheet = page.getByRole("dialog", { name: vi.zalo.title });
    await expect(sheet).toHaveAttribute("data-layout", "sheet");
    await expect(sheet.getByRole("img", { name: vi.zalo.qrAlt })).toBeVisible();
    await expect(sheet.getByRole("link", { name: new RegExp(vi.zalo.open) })).toHaveAttribute(
      "target",
      "_blank",
    );
  });
});

test.describe("Zalo contact on a 375 px phone", () => {
  test.use({ viewport: PHONE, hasTouch: true, isMobile: true });

  test("the hero button opens a bottom sheet with Open Zalo and no QR code", async ({ page }) => {
    await page.goto("/vi");
    expect(await page.evaluate(() => matchMedia("(pointer: coarse)").matches)).toBe(true);
    await page.getByRole("link", { name: vi.hero.zaloCta }).click();
    const sheet = page.getByRole("dialog", { name: vi.zalo.title });
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute("data-layout", "sheet");
    await expect(page).toHaveURL(/\/vi$/);
    await expect(sheet.getByRole("img")).toHaveCount(0);
    await expect(sheet.getByRole("link", { name: vi.zalo.open })).not.toHaveAttribute("target");
    const open = sheet.getByRole("link", { name: vi.zalo.open });
    await expect(open).toHaveAttribute("href", ZALO_URL);
    await expect(sheet.getByRole("button", { name: vi.zalo.copy })).toBeVisible();

    // The sheet sits on the bottom edge, across the screen, with large buttons, once its
    // short slide-in has ended.
    await sheet.evaluate((el) => Promise.all(el.getAnimations().map((a) => a.finished)));
    const box = await sheet.boundingBox();
    expect(Math.round((box?.y ?? 0) + (box?.height ?? 0))).toBe(PHONE.height);
    expect(Math.round(box?.width ?? 0)).toBe(PHONE.width);
    const openBox = await open.boundingBox();
    expect(openBox?.height).toBeGreaterThanOrEqual(44);

    await sheet.getByRole("button", { name: vi.zalo.close }).click();
    await expect(sheet).toBeHidden();
  });
});

test.describe("Zalo contact without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the link still goes to zalo.me", async ({ page }) => {
    await page.route("https://zalo.me/**", (route) =>
      route.fulfill({ status: 200, contentType: "text/html", body: "<title>Zalo</title>" }),
    );
    await page.goto("/vi");
    await headerZalo(page).click();
    await expect(page).toHaveURL(ZALO_URL);
  });
});

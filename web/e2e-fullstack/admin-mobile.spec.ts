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

test("the bottom menu has Sản phẩm, with 13 px labels at least 12 px from the screen edges", async ({ page }) => {
  await page.goto(ADMIN_ROUTES.home);
  const nav = page.getByRole("navigation", { name: "Menu chính" });
  await expect(nav.getByRole("link", { name: "Sản phẩm" })).toBeVisible();
  const labels = await nav.locator("li span").evaluateAll((spans) =>
    spans.map((span) => {
      const box = span.getBoundingClientRect();
      return { text: span.textContent, left: box.left, right: box.right, size: getComputedStyle(span).fontSize };
    }),
  );
  expect(labels.map((label) => label.text)).toEqual(["Tổng quan", "Sản phẩm", "Câu chuyện", "Ảnh", "Thêm"]);
  for (const label of labels) {
    expect(label.size).toBe("13px");
    expect(label.left).toBeGreaterThanOrEqual(12);
    expect(label.right).toBeLessThanOrEqual(WIDTH - 12);
  }
  // Labels do not touch each other.
  for (let i = 1; i < labels.length; i += 1) expect(labels[i].left - labels[i - 1].right).toBeGreaterThanOrEqual(6);
});

test("a dialog opens without the phone keyboard: the cursor is not in its first box", async ({ page }) => {
  await page.goto(ADMIN_ROUTES.timeline);
  await page.getByRole("button", { name: "Thêm mốc" }).click();
  const form = page.getByRole("dialog", { name: "Thêm mốc" });
  await expect(form).toBeVisible();
  await expect(form).toBeFocused();
  await expect(form.getByLabel("Năm")).not.toBeFocused();
  await page.keyboard.press("Escape");
  await expect(form).toBeHidden();
});

test("a removed pack size comes back with Hoàn tác, messages show at the top, and the saved product has its header", async ({ page }) => {
  const name = `[E2E] Sản phẩm ${Math.floor(Math.random() * 1_000_000)}`;
  await page.goto(`${ADMIN_ROUTES.products}/moi`);
  const nav = page.getByRole("navigation", { name: "Menu chính" });
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sản phẩm mới");
  await page.getByRole("group", { name: /^Tên sản phẩm/ }).getByLabel("Tiếng Việt").fill(name);
  await page.getByRole("button", { name: "Thêm đặc điểm" }).click();
  await page.getByLabel("Đặc điểm 1 (tiếng Việt)").fill("Hạt tròn");
  await page.getByRole("button", { name: "Thêm quy cách" }).click();
  await page.getByLabel(/^Khối lượng/).fill("500");
  // The delete button sits apart from the arrows: a slip of the finger moves a row, it does not delete it.
  const downBox = (await page.getByRole("button", { name: "Đưa quy cách 1 xuống" }).boundingBox())!;
  const deleteBox = (await page.getByRole("button", { name: "Xóa quy cách 1" }).boundingBox())!;
  expect(deleteBox.x - (downBox.x + downBox.width)).toBeGreaterThanOrEqual(24);
  expect(deleteBox.y).toBe(downBox.y);

  await page.getByRole("button", { name: "Xóa quy cách 1" }).click();
  await expect(page.getByLabel(/^Khối lượng/)).toHaveCount(0);
  const removed = page.locator("[data-sonner-toast]").filter({ hasText: "Đã xóa quy cách 1 (500 g)." });
  await expect(removed).toBeVisible();
  const navBox = await nav.boundingBox();
  const removedBox = await removed.boundingBox();
  expect(removedBox!.y).toBeLessThan(150);
  expect(removedBox!.y + removedBox!.height).toBeLessThan(navBox!.y);
  const undo = removed.getByRole("button", { name: "Hoàn tác" });
  expect((await undo.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  await undo.click();
  await expect(page.getByLabel(/^Khối lượng/)).toHaveValue("500");

  await page.getByRole("button", { name: "Lưu", exact: true }).click();
  const saved = page.locator("[data-sonner-toast]").filter({ hasText: "Đã lưu." });
  await expect(saved).toBeVisible();
  const savedBox = await saved.boundingBox();
  expect(savedBox!.y + savedBox!.height).toBeLessThan(navBox!.y);
  expect(savedBox!.y).toBeLessThan(150);

  // The page of the new product: the way back, its name, and where it shows on the public site.
  await expect(page).toHaveURL(new RegExp(`${ADMIN_ROUTES.products}/\\d+$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(name);
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Quay lại danh sách sản phẩm" })).toHaveAttribute("href", ADMIN_ROUTES.products);
  // A new product is hidden, so it has no public page yet. Once "Hiện trên web" is on, the header links to it.
  await expect(header.getByRole("link", { name: /^Xem trên web/ })).toHaveCount(0);
  await page.getByRole("switch", { name: "Hiện trên web" }).click();
  await page
    .getByRole("alertdialog", { name: "Kiểm tra trước khi hiện trên web" })
    .getByRole("button", { name: /^(Vẫn hiện|Hiện trên web)$/ })
    .click();
  await expect(page.getByRole("switch", { name: "Hiện trên web" })).toBeChecked();
  await expect(header.getByRole("link", { name: /^Xem trên web/ })).toHaveAttribute("href", "/vi#san-pham");
  expect(await pageScrollWidth(page)).toBeLessThanOrEqual(WIDTH);
  await expect(page.locator("[data-sonner-toast]")).toHaveCount(0, { timeout: 10_000 });

  // A message on the product page starts below Quay lại and Xem trên web.
  await page.getByRole("button", { name: "Xóa đặc điểm 1" }).click();
  const featureRemoved = page.locator("[data-sonner-toast]").filter({ hasText: "Đã xóa đặc điểm 1 (Hạt tròn)." });
  await expect(featureRemoved).toBeVisible();
  const toastTop = (await featureRemoved.boundingBox())!.y;
  for (const link of [header.getByRole("link", { name: "Quay lại danh sách sản phẩm" }), header.getByRole("link", { name: /^Xem trên web/ })]) {
    const box = (await link.boundingBox())!;
    expect(toastTop).toBeGreaterThanOrEqual(box.y + box.height);
  }
  // Bỏ thay đổi brings the row back and closes the Hoàn tác message, so the row cannot come back twice.
  await page.getByRole("button", { name: "Bỏ thay đổi", exact: true }).click();
  await page.getByRole("alertdialog", { name: "Bỏ thay đổi chưa lưu?" }).getByRole("button", { name: "Bỏ thay đổi" }).click();
  await expect(featureRemoved).toBeHidden();
  await expect(page.getByLabel(/^Đặc điểm \d \(tiếng Việt\)$/)).toHaveCount(1);
  await expect(page.getByLabel("Đặc điểm 1 (tiếng Việt)")).toHaveValue("Hạt tròn");
  await header.getByRole("link", { name: "Quay lại danh sách sản phẩm" }).click();
  await expect(page).toHaveURL(new RegExp(`${ADMIN_ROUTES.products}$`));
});

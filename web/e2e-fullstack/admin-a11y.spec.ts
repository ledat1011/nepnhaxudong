import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { ADMIN_ROUTES } from "../src/lib/admin/routes";

async function seriousViolations(page: Page) {
  const { violations } = await new AxeBuilder({ page }).analyze();
  return violations
    .filter((violation) => violation.impact === "serious" || violation.impact === "critical")
    .map((violation) => `${violation.id} (${violation.impact}): ${violation.nodes.map((node) => node.target.join(" ")).join(" | ")}`);
}

test("the sign-in page has no serious accessibility problem", async ({ browser, baseURL }) => {
  // This page is for people who are not signed in: no saved session.
  const context = await browser.newContext({ baseURL, storageState: { cookies: [], origins: [] } });
  const page = await context.newPage();
  await page.goto(ADMIN_ROUTES.login);
  await expect(page.getByRole("button", { name: "Đăng nhập" })).toBeVisible();
  expect(await seriousViolations(page)).toEqual([]);
  await context.close();
});

test("the dashboard has no serious accessibility problem", async ({ page }) => {
  await page.goto(ADMIN_ROUTES.home);
  await expect(page.getByRole("navigation", { name: "Menu chính" })).toBeVisible();
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Đang tải")).toHaveCount(0);
  expect(await seriousViolations(page)).toEqual([]);
});

test("the story form has no serious accessibility problem", async ({ page }) => {
  await page.goto(`${ADMIN_ROUTES.stories}/moi`);
  await expect(page.locator(".ProseMirror").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  expect(await seriousViolations(page)).toEqual([]);
});

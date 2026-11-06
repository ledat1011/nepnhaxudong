import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const paths = [
  "/vi",
  "/en",
  "/vi/cau-chuyen",
  "/vi/cau-chuyen/tu-cua-hang-vat-tu-toi-bich-gao",
];

for (const path of paths) {
  test(`no WCAG 2 A/AA violations on ${path}`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

import { expect, test } from "@playwright/test";

const VI_SLUG = "mua-gat-dau-tien-o-xu-dong";
const VI_TITLE = "[MẪU] Mùa gặt đầu tiên ở xứ Đông";
// This story has no own English slug: the English page keeps the Vietnamese slug.
const SHARED_SLUG = "chuyen-nha-nep-xu-dong";

test.describe("story list and story pages", () => {
  test("the list shows every story as a card", async ({ page }) => {
    await page.goto("/vi/cau-chuyen");
    await expect(page.getByRole("article")).toHaveCount(4);
  });

  test("a story opens from the list with its own title", async ({ page }) => {
    await page.goto("/vi/cau-chuyen");
    await page.getByRole("link", { name: VI_TITLE }).click();
    await expect(page).toHaveURL(new RegExp(`/vi/cau-chuyen/${VI_SLUG}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(VI_TITLE);
  });

  test("a story without its own English slug opens under the Vietnamese slug", async ({
    page,
  }) => {
    const response = await page.goto(`/en/stories/${SHARED_SLUG}`);
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Chuyện nhà Nếp");
  });

  const notFound = [
    ["the English section on a Vietnamese path", `/vi/stories/${VI_SLUG}`],
    ["the Vietnamese section on an English path", `/en/cau-chuyen/${VI_SLUG}`],
    ["a page that is not a number", "/vi/cau-chuyen?page=abc"],
    ["a story that does not exist", "/vi/cau-chuyen/khong-co"],
  ];

  for (const [name, path] of notFound) {
    test(`${name} is a 404`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
    });
  }
});

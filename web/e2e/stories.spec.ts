import { expect, test } from "@playwright/test";

const VI_SLUG = "tu-cua-hang-vat-tu-toi-bich-gao";
const VI_TITLE = "Từ cửa hàng vật tư tới bịch gạo mang tên quê";
// This story has no own English slug: the English page keeps the Vietnamese slug.
const SHARED_SLUG = "nep-cai-hoa-vang-len-truyen-hinh";

test.describe("story list and story pages", () => {
  test("the list shows every story as a card", async ({ page }) => {
    await page.goto("/vi/cau-chuyen");
    await expect(page.getByRole("article")).toHaveCount(5);
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
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Nếp cái hoa vàng lên truyền hình phường",
    );
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

test.describe("rice story section", () => {
  // The scenes are WebP images (decision 0014); without motion nothing else changes them.
  test.use({ reducedMotion: "reduce" });

  test("a scene drawing is served and loads in the page", async ({ page, request }) => {
    const response = await request.get("/story/canh-1-cay-ma.webp");
    expect(response.status()).toBe(200);
    await page.goto("/vi");
    const img = page.locator('li[data-story-scene="cay-ma"] img');
    await img.scrollIntoViewIfNeeded();
    await expect
      .poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth))
      .toBeGreaterThan(0);
  });

  test("is one road timeline of eight numbered steps", async ({ page }) => {
    await page.goto("/en");
    const steps = page.locator("ol[data-story-list] > li[data-story-scene] [data-story-step]");
    await expect(steps).toHaveText(Array.from({ length: 8 }, (_, i) => `Step ${i + 1}`));
    await expect(page.locator("[data-story-road][aria-hidden='true']")).toHaveCount(8);
    await expect(page.locator("[data-story-progress], [data-story-pin]")).toHaveCount(0);
  });
});

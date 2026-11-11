import { expect, test, type Page } from "@playwright/test";
import { getDictionary } from "../src/lib/i18n/dictionaries";

const vi = getDictionary("vi");
const NARROW = { width: 320, height: 640 };
const PHONE = { width: 375, height: 812 };

test.describe("redirect from /", () => {
  test("an English browser still lands on /vi", async ({ browser, baseURL }) => {
    const context = await browser.newContext({ baseURL, locale: "en-US" });
    const page = await context.newPage();
    await page.goto("/");
    await expect(page).toHaveURL(/\/vi$/);
    await context.close();
  });

  test("/ answers 307 to /vi and does not vary on Accept-Language", async ({ request }) => {
    const response = await request.get("/", { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers()["location"], response.url()).pathname).toBe("/vi");
    expect(response.headers()["vary"] ?? "").not.toContain("Accept-Language");
  });
});

test.describe("home page", () => {
  test("shows the brand, sample content and the Zalo link", async ({ page }) => {
    await page.goto("/vi");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Nếp Nhà");
    await expect(page.getByText("[MẪU]").first()).toBeVisible();
    await expect(page.locator('a[href="https://zalo.me/0967598629"]').first()).toBeVisible();
  });

  test("the language switch goes to /en and sets html lang", async ({ page }) => {
    await page.goto("/vi");
    await expect(page.locator("html")).toHaveAttribute("lang", "vi");
    await page.getByRole("link", { name: "English", exact: true }).click();
    await expect(page).toHaveURL(/\/en$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("an unknown language is a 404", async ({ page }) => {
    const response = await page.goto("/fr");
    expect(response?.status()).toBe(404);
  });

  test("smooth scrolling is on by default and off with reduced motion", async ({
    browser,
    baseURL,
  }) => {
    const scrollBehavior = async (reducedMotion: "no-preference" | "reduce") => {
      const context = await browser.newContext({ baseURL, reducedMotion });
      const page = await context.newPage();
      await page.goto("/vi");
      const behavior = await page.evaluate(
        () => getComputedStyle(document.documentElement).scrollBehavior,
      );
      await context.close();
      return behavior;
    };

    // The first check proves the page does set smooth scrolling, so "auto" below means the
    // reduced-motion rule won and is not just the browser default.
    expect(await scrollBehavior("no-preference")).toBe("smooth");
    expect(await scrollBehavior("reduce")).toBe("auto");
  });
});

test.describe("mobile menu at 375x812", () => {
  test.use({ viewport: PHONE });

  test("opens, scrolls to the contact section and closes", async ({ page }) => {
    await page.goto("/vi");
    const button = page.getByRole("button", { name: vi.nav.openMenu });
    await expect(button).toHaveAttribute("aria-expanded", "false");

    await button.click();
    const menu = page.getByRole("navigation", { name: vi.nav.label });
    await expect(page.getByRole("button", { name: vi.nav.closeMenu })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    await menu.getByRole("link", { name: vi.nav.contact, exact: true }).click();

    await expect(page).toHaveURL(/#lien-he$/);
    await expect(page.locator("#lien-he")).toBeInViewport();
    await expect(page.getByRole("button", { name: vi.nav.openMenu })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("the close button closes the menu", async ({ page }) => {
    await page.goto("/vi");
    await page.getByRole("button", { name: vi.nav.openMenu }).click();
    await expect(page.getByRole("link", { name: vi.nav.product, exact: true })).toBeVisible();
    await page.getByRole("button", { name: vi.nav.closeMenu }).click();
    await expect(page.getByRole("link", { name: vi.nav.product, exact: true })).toBeHidden();
  });
});

test.describe("no horizontal scroll at 320x640", () => {
  test.use({ viewport: NARROW });

  const paths = [
    "/vi",
    "/en",
    "/vi/cau-chuyen/tu-cua-hang-vat-tu-toi-bich-gao",
    "/en/stories/from-farm-shop-to-rice-bag",
  ];

  for (const path of paths) {
    test(path, async ({ page }) => {
      await page.goto(path);
      const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);
    });
  }
});

// The full menu needs about 830 px; below 1024 px the header shows the menu button instead.
for (const width of [768, 1023]) {
  test.describe(`header at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of ["/vi", "/en"]) {
      test(`${path}: no horizontal scroll, menu behind the menu button`, async ({ page }) => {
        await page.goto(path);
        const widths = await page.evaluate(() => ({
          scroll: document.documentElement.scrollWidth,
          client: document.documentElement.clientWidth,
        }));
        expect(widths.scroll).toBeLessThanOrEqual(widths.client);
        const dict = getDictionary(path === "/vi" ? "vi" : "en");
        await expect(page.getByRole("button", { name: dict.nav.openMenu })).toBeVisible();
      });
    }
  });
}

test.describe("journey photos", () => {
  const CERTIFICATE = "Giấy chứng nhận cơ sở đủ điều kiện an toàn thực phẩm, cấp năm 2021";
  const BAG = "Bao gạo nếp cái hoa vàng Duy Tân 2 kg đầu tiên, năm 2021";
  const milestone2021 = (page: Page) =>
    page.locator("[data-journey-event]").filter({ hasText: "2021" });

  test("a click on a photo opens it large; Esc closes it and gives focus back", async ({
    page,
  }) => {
    await page.goto("/vi");
    const photo = milestone2021(page).getByRole("button", { name: CERTIFICATE });
    await photo.click();

    const dialog = page.getByRole("dialog", { name: vi.gallery.viewLarge });
    await expect(dialog).toBeVisible();
    const certificate = dialog.getByRole("img", { name: CERTIFICATE });
    await expect(certificate).toBeVisible();
    // The whole photo fits the screen: no part of it is cut off.
    const box = (await certificate.boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
    expect(box.height / box.width).toBeCloseTo(1165 / 797, 1);
    await dialog.getByRole("button", { name: vi.gallery.next }).click();
    await expect(dialog.getByRole("img", { name: BAG })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(photo).toBeFocused();
  });

  test.describe("at 375x812", () => {
    test.use({ viewport: PHONE });

    test("no horizontal scroll, and the 2021 photos stay below the text", async ({ page }) => {
      await page.goto("/vi");
      const widths = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      expect(widths.scroll).toBeLessThanOrEqual(widths.client);

      const event = milestone2021(page);
      const text = await event.locator("p").last().boundingBox();
      const frames = event.locator("[data-journey-photo]");
      await expect(frames).toHaveCount(2);
      for (const frame of await frames.all()) {
        const box = await frame.boundingBox();
        expect(box!.y).toBeGreaterThanOrEqual(text!.y + text!.height);
        expect(box!.x + box!.width).toBeLessThanOrEqual(widths.client);
      }
    });
  });
});

for (const width of [768, 1024, 1440]) {
  test.describe(`rice story at ${width} px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("scenes interleave without overlap, and the road joins at every stop", async ({ page }) => {
      await page.goto("/vi");
      const shape = await page.evaluate(() =>
        [...document.querySelectorAll("[data-story-scene]")].map((li) => {
          const box = li.getBoundingClientRect();
          const road = li.querySelector("[data-story-road]")!.getBoundingClientRect();
          const stop = li.querySelector("[data-story-stop]")!.getBoundingClientRect();
          const content = li.querySelector("[data-story-content]")!.getBoundingClientRect();
          return {
            top: box.top,
            contentBottom: content.bottom,
            roadTop: road.top,
            roadBottom: road.bottom,
            stopMiddle: stop.top + stop.height / 2,
          };
        }),
      );
      expect(shape).toHaveLength(8);
      for (let i = 0; i + 1 < shape.length; i++) {
        // Each scene starts before the one above it ends: the columns fill each other's gaps.
        expect(shape[i + 1].top).toBeLessThan(shape[i].contentBottom);
        // The stretch of road ends where the next one starts, at the next scene's stop.
        expect(Math.abs(shape[i].roadBottom - shape[i + 1].roadTop)).toBeLessThanOrEqual(1);
        expect(Math.abs(shape[i].roadBottom - shape[i + 1].stopMiddle)).toBeLessThanOrEqual(1);
        // The stops are not crowded on the road (the owner found 250 px apart too close).
        expect(shape[i + 1].stopMiddle - shape[i].stopMiddle).toBeGreaterThanOrEqual(280);
      }
      for (let i = 0; i + 2 < shape.length; i++) {
        // A scene ends at least 24 px above the next scene on its own side.
        expect(shape[i + 2].top - shape[i].contentBottom).toBeGreaterThanOrEqual(24);
      }
    });
  });
}

import { expect, test, type Page } from "@playwright/test";
import { getDictionary } from "../src/lib/i18n/dictionaries";

const vi = getDictionary("vi");
const en = getDictionary("en");
const PHONE = { width: 375, height: 812 };
const NARROW = { width: 320, height: 640 };
const MIN_TAP_PX = 44;

/**
 * Every visible link and button whose hit box is smaller than 44 x 44 px. Skipped, with the
 * reason: elements that are not visible (display none, the `hidden` menu panel, the sr-only
 * skip link before it gets focus, which has its own test) and links inside running story text
 * (`data-inline-text-links`, the inline exception of WCAG 2.5.8). A link whose `::after`
 * covers its card (the story cards) is measured by the card, which is what a finger hits.
 */
async function smallTargets(page: Page, minPx = MIN_TAP_PX) {
  return page.evaluate((min) => {
    const found: string[] = [];
    const controls = document.querySelectorAll<HTMLElement>(
      'a[href], button, summary, [role="button"]',
    );
    for (const el of controls) {
      if (el.closest("[data-inline-text-links]")) continue;
      let rect = el.getBoundingClientRect();
      if (rect.width <= 1 || rect.height <= 1) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden") continue;
      // Visually hidden (Tailwind sr-only): clipped to nothing until it gets focus.
      if (style.clipPath === "inset(50%)" || style.clip === "rect(0px, 0px, 0px, 0px)") continue;
      const after = getComputedStyle(el, "::after");
      if (after.position === "absolute" && after.content !== "none") {
        let box = el.parentElement;
        while (box && getComputedStyle(box).position === "static") box = box.parentElement;
        if (box) rect = box.getBoundingClientRect();
      }
      if (rect.width < min - 0.5 || rect.height < min - 0.5) {
        const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40);
        found.push(`${el.tagName.toLowerCase()} "${name}" ${Math.round(rect.width)}x${Math.round(rect.height)}`);
      }
    }
    return found;
  }, minPx);
}

async function hasNoHorizontalScroll(page: Page) {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll).toBeLessThanOrEqual(client);
}

test.describe("tap targets of at least 44 x 44 px at 375 px", () => {
  test.use({ viewport: PHONE, reducedMotion: "reduce" });

  test("/vi, with the menu closed and open", async ({ page }) => {
    await page.goto("/vi");
    expect(await smallTargets(page)).toEqual([]);
    await page.getByRole("button", { name: vi.nav.openMenu }).click();
    await expect(page.getByRole("link", { name: vi.nav.product, exact: true })).toBeVisible();
    expect(await smallTargets(page)).toEqual([]);
  });

  for (const path of [
    "/en",
    "/vi/cau-chuyen",
    "/vi/cau-chuyen/mua-gat-dau-tien-o-xu-dong",
    "/khong/co/trang/nay",
    "/vi/cau-chuyen/khong-co",
  ]) {
    test(path, async ({ page }) => {
      await page.goto(path);
      expect(await smallTargets(page)).toEqual([]);
    });
  }
});

test("the skip link is 44 px high once Tab shows it", async ({ page }) => {
  await page.setViewportSize(PHONE);
  await page.goto("/vi");
  await page.keyboard.press("Tab");
  const skip = page.getByRole("link", { name: vi.nav.skipToContent });
  await expect(skip).toBeFocused();
  const box = await skip.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(MIN_TAP_PX);
  expect(box?.width).toBeGreaterThanOrEqual(MIN_TAP_PX);
});

test.describe("the larger controls still fit at 320 px", () => {
  test.use({ viewport: NARROW });

  for (const path of ["/vi/cau-chuyen", "/khong/co/trang/nay"]) {
    test(`${path} has no horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      await hasNoHorizontalScroll(page);
    });
  }

  test("/vi: the header row keeps every control inside the screen", async ({ page }) => {
    await page.goto("/vi");
    const right = await page.evaluate(() =>
      Math.max(
        ...[...document.querySelectorAll("header a, header button")]
          .map((el) => el.getBoundingClientRect())
          .filter((rect) => rect.width > 1)
          .map((rect) => rect.right),
      ),
    );
    expect(right).toBeLessThanOrEqual(NARROW.width);
  });
});

test.describe("controls show that they can be used", () => {
  test("every enabled control has the pointer cursor, the menu button included", async ({
    page,
  }) => {
    await page.setViewportSize(PHONE);
    await page.goto("/vi");
    const cursors = await page.evaluate(() =>
      [...document.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)")].map(
        (el) => getComputedStyle(el).cursor,
      ),
    );
    expect(cursors.length).toBeGreaterThan(10);
    expect(new Set(cursors)).toEqual(new Set(["pointer"]));
  });

  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`a pressed control shifts 1 px at once, with no animation (${reducedMotion})`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({ baseURL, viewport: PHONE, reducedMotion });
      const page = await context.newPage();
      await page.goto("/vi");
      const button = page.getByRole("button", { name: vi.nav.openMenu });
      const box = await button.boundingBox();
      if (box === null) throw new Error("menu button has no box");
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      const pressed = await button.evaluate((el) => ({
        translate: getComputedStyle(el).translate,
        transition: getComputedStyle(el).transitionDuration,
        animations: el.getAnimations().length,
      }));
      await page.mouse.up();
      expect(pressed.translate).toBe("0px 1px");
      expect(pressed.animations).toBe(0);
      expect(pressed.transition.split(",").every((d) => parseFloat(d) < 0.001)).toBe(true);
      await context.close();
    });
  }

  test("the logo link underlines the site name on hover", async ({ page }) => {
    await page.goto("/vi");
    const logo = page.getByRole("banner").getByRole("link", { name: vi.site.name });
    const name = logo.locator("span");
    await expect(name).toHaveCSS("text-decoration-line", "none");
    await logo.hover();
    await expect(name).toHaveCSS("text-decoration-line", "underline");
  });
});

test.describe("404 pages are whole documents with landmarks", () => {
  for (const path of ["/khong/co/trang/nay", "/vi/cau-chuyen/khong-co"]) {
    test(`${path} has a header with the home link, main and footer`, async ({ page }) => {
      const response = await page.goto(path);
      expect(response?.status()).toBe(404);
      await expect(page.getByRole("banner")).toHaveCount(1);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(page.getByRole("contentinfo")).toHaveCount(1);
      await expect(page.getByRole("banner").getByRole("link", { name: vi.site.name })).toHaveAttribute(
        "href",
        "/",
      );
    });
  }
});

test.describe("loading state of links to pages rendered on request", () => {
  for (const reducedMotion of ["no-preference", "reduce"] as const) {
    test(`'Xem tất cả' says the list is loading while it loads (${reducedMotion})`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({ baseURL, reducedMotion });
      const page = await context.newPage();
      // Hold the in-app navigation request (RSC) to the list, as a slow API would.
      let release = () => {};
      const held = new Promise<void>((resolve) => (release = resolve));
      await page.route(/\/vi\/cau-chuyen(\?|$)/, async (route) => {
        if (route.request().headers()["rsc"] !== undefined) await held;
        await route.continue();
      });
      await page.goto("/vi");
      await page.getByRole("link", { name: vi.stories.viewAll }).click();

      const status = page.getByRole("status").filter({ hasText: vi.loading.page });
      await expect(status).toBeVisible();
      const shown = await status.evaluate((el) => ({
        position: getComputedStyle(el).position,
        animations: document.getAnimations().length,
      }));
      // Fixed: showing it moves nothing on the page. No animation, also with motion on.
      expect(shown.position).toBe("fixed");
      expect(shown.animations).toBe(0);
      await expect(page).toHaveURL(/\/vi$/);

      release();
      await expect(page).toHaveURL(/\/vi\/cau-chuyen$/);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(vi.sections.story);
      await expect(page.getByText(vi.loading.page)).toHaveCount(0);
      await context.close();
    });
  }
});

test.describe("product features", () => {
  const cases = [
    ["/vi", ["tròn mẩy", "dẻo", "thơm"]],
    ["/en", ["plump", "soft", "fragrant"]],
  ] as const;

  for (const [path, words] of cases) {
    test(`${path}: each feature shows its own icon`, async ({ page }) => {
      await page.goto(path);
      const heading = path === "/vi" ? vi.product.features : en.product.features;
      const list = page.getByRole("heading", { name: heading }).locator("xpath=following-sibling::ul");
      const rows = await list.locator("li").evaluateAll((items) =>
        items.map((li) => ({
          text: li.textContent?.toLowerCase() ?? "",
          icon: li.querySelector("svg")?.getAttribute("data-icon"),
        })),
      );
      expect(rows.map((row) => row.icon)).toEqual(["round", "soft", "fragrant"]);
      rows.forEach((row, i) => expect(row.text).toContain(words[i]));
    });
  }
});

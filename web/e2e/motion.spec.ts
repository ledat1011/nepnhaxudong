import { expect, test, type Page, type Response } from "@playwright/test";

const MOTION_ON = "html[data-motion='on']";
const SCROLL_STEP_PX = 400;

async function scrollThroughPage(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y <= height; y += SCROLL_STEP_PX) {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(100);
  }
  await page.waitForTimeout(1000);
}

async function revealOpacities(page: Page, selector = "[data-reveal]") {
  return page.$$eval(selector, (els) => els.map((el) => getComputedStyle(el).opacity));
}

function recordScripts(page: Page) {
  const bodies: { url: string; body: string; at: number }[] = [];
  const pending: Promise<void>[] = [];
  page.on("response", (response: Response) => {
    if (!response.url().endsWith(".js") && !response.url().includes(".js?")) return;
    pending.push(
      response
        .text()
        .then((body) => {
          bodies.push({ url: response.url(), body, at: Date.now() });
        })
        .catch(() => undefined),
    );
  });
  return { bodies, settle: () => Promise.all(pending) };
}

test("motion starts and nothing stays hidden after scrolling to the end", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await scrollThroughPage(page);
  const opacities = await revealOpacities(page);
  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((opacity) => opacity === "1")).toBe(true);
  const transforms = await page.$$eval("[data-reveal]", (els) =>
    els.map((el) => getComputedStyle(el).transform),
  );
  expect(transforms.every((transform) => transform === "none")).toBe(true);
});

test("elements in the first screen are never hidden", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 1200 });
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await page.waitForTimeout(300);
  const opacities = await page.$$eval("[data-reveal]", (els) =>
    els
      .filter((el) => el.getBoundingClientRect().top < window.innerHeight)
      .map((el) => getComputedStyle(el).opacity),
  );
  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((opacity) => opacity === "1")).toBe(true);
});

test("a deep link keeps the sections above and in view visible", async ({ page }) => {
  await page.goto("/vi#bao-chi");
  await page.waitForSelector(MOTION_ON);
  // Test mechanics: wait until the jump to the anchor has stopped, then read once.
  let previous = -1;
  for (let i = 0; i < 50; i++) {
    const current = await page.evaluate(() => window.scrollY);
    if (current === previous) break;
    previous = current;
    await page.waitForTimeout(100);
  }
  const opacities = await page.$$eval("[data-reveal]", (els) =>
    els
      .filter((el) => el.getBoundingClientRect().top < window.innerHeight)
      .map((el) => getComputedStyle(el).opacity),
  );
  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((opacity) => opacity === "1")).toBe(true);
});

test("the contact block at the end of the page appears", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  const contact = "section[aria-labelledby='lien-he'] [data-reveal]";
  expect((await revealOpacities(page, contact)).every((opacity) => opacity === "0")).toBe(true);
  await page.keyboard.press("End");
  await page.waitForTimeout(1500);
  const opacities = await revealOpacities(page, "section[aria-labelledby='lien-he'] [data-reveal]");
  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((opacity) => opacity === "1")).toBe(true);
});

// The mock content has no product image, so the lightbox cannot be opened here. The lightbox is a
// non-portal `fixed inset-0` element inside the revealed block, so this test puts the same kind
// of element in that block and checks that it still covers the whole screen.
test("a fixed overlay inside the revealed gallery block covers the whole screen", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await scrollThroughPage(page);
  const box = await page.evaluate(() => {
    const article = document.querySelector("article");
    const block = article?.querySelector("[data-reveal]");
    if (!block) return null;
    const overlay = document.createElement("div");
    overlay.style.cssText = "position: fixed; inset: 0;";
    block.appendChild(overlay);
    const rect = overlay.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
  const viewport = page.viewportSize();
  expect(box).toEqual({ x: 0, y: 0, width: viewport?.width, height: viewport?.height });
});

test("no layout shift while scrolling", async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __cls: number };
    w.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as unknown as {
        value: number;
        hadRecentInput: boolean;
      }[]) {
        if (!entry.hadRecentInput) w.__cls += entry.value;
      }
    }).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await scrollThroughPage(page);
  const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
  expect(cls).toBeLessThan(0.1);
});

test("GSAP arrives as a separate chunk after load", async ({ page }) => {
  const scripts = recordScripts(page);
  let loadedAt = Infinity;
  page.on("load", () => {
    loadedAt = Date.now();
  });
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await scripts.settle();
  const gsapChunks = scripts.bodies.filter(({ body }) => body.includes("_gsap"));
  expect(gsapChunks.length).toBeGreaterThan(0);
  expect(gsapChunks.every(({ at }) => at >= loadedAt)).toBe(true);
});

test("turning reduced motion on while the page is open reverts the motion", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForSelector("html:not([data-motion])");
  const opacities = await revealOpacities(page);
  expect(opacities.every((opacity) => opacity === "1")).toBe(true);
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("reduced motion: GSAP is never loaded and nothing is hidden", async ({ page }) => {
    const scripts = recordScripts(page);
    await page.goto("/vi");
    await page.waitForTimeout(3000);
    await scripts.settle();
    expect(scripts.bodies.length).toBeGreaterThan(0);
    expect(scripts.bodies.some(({ body }) => body.includes("_gsap"))).toBe(false);
    await expect(page.locator("html")).not.toHaveAttribute("data-motion", /.*/);
    await scrollThroughPage(page);
    const styles = await page.$$eval("[data-reveal]", (els) =>
      els.map((el) => ({
        opacity: getComputedStyle(el).opacity,
        transform: getComputedStyle(el).transform,
      })),
    );
    expect(styles.length).toBeGreaterThan(0);
    expect(styles.every((s) => s.opacity === "1" && s.transform === "none")).toBe(true);
  });
});

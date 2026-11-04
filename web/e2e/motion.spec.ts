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
});

test("elements in the first screen are never hidden", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await page.waitForTimeout(300);
  const opacities = await page.$$eval("[data-reveal]", (els) =>
    els
      .filter((el) => el.getBoundingClientRect().top < window.innerHeight)
      .map((el) => getComputedStyle(el).opacity),
  );
  expect(opacities.every((opacity) => opacity === "1")).toBe(true);
});

test("a deep link keeps the sections above and in view visible", async ({ page }) => {
  await page.goto("/vi#bao-chi");
  await page.waitForSelector(MOTION_ON);
  // The browser may finish the jump to the anchor after the motion starts. Blocks that the
  // jump passes then slide in over a short time, so wait for them instead of reading at once.
  await expect
    .poll(
      () =>
        page.locator("[data-reveal]").evaluateAll((els) => {
          const inViewOrAbove = els.filter(
            (el) => el.getBoundingClientRect().top < window.innerHeight,
          );
          return {
            count: inViewOrAbove.length,
            allVisible: inViewOrAbove.every((el) => getComputedStyle(el).opacity === "1"),
          };
        }),
      { timeout: 5000 },
    )
    .toMatchObject({ allVisible: true });
  const count = await page.locator("[data-reveal]").evaluateAll(
    (els) => els.filter((el) => el.getBoundingClientRect().top < window.innerHeight).length,
  );
  expect(count).toBeGreaterThan(0);
});

test("the contact block at the end of the page appears", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await page.keyboard.press("End");
  await page.waitForTimeout(1500);
  const opacities = await revealOpacities(page, "section[aria-labelledby='lien-he'] [data-reveal]");
  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((opacity) => opacity === "1")).toBe(true);
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

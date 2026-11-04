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

type MascotGroup = "head" | "rice";

const HEAD_PIVOT = { x: 278, y: 257 };
const RICE_PIVOT = { x: 302, y: 356 };
const HEAD_LIMIT_DEG = 3.01;
const RICE_LIMIT_DEG = 6.01;
const MOBILE = { width: 375, height: 812 };

/** The rotation of a mascot group in degrees, relative to the mascot svg. */
async function rotationOf(page: Page, id: MascotGroup) {
  return page.evaluate((groupId) => {
    const svg = document.querySelector<SVGSVGElement>("svg[data-mascot]");
    const group = svg?.querySelector<SVGGElement>(`g#${groupId}`);
    const svgCtm = svg?.getCTM();
    const groupCtm = group?.getCTM();
    if (!svgCtm || !groupCtm) throw new Error(`mascot group ${groupId} not found`);
    const m = svgCtm.inverse().multiply(groupCtm);
    return (Math.atan2(m.b, m.a) * 180) / Math.PI;
  }, id);
}

/** Screen distance (px) between the pivot moved by the group transform and by the svg alone. */
async function pivotDrift(page: Page, id: MascotGroup, x: number, y: number) {
  return page.evaluate(
    ({ groupId, px, py }) => {
      const svg = document.querySelector<SVGSVGElement>("svg[data-mascot]");
      const group = svg?.querySelector<SVGGElement>(`g#${groupId}`);
      const svgCtm = svg?.getScreenCTM();
      const groupCtm = group?.getScreenCTM();
      if (!svgCtm || !groupCtm) throw new Error(`mascot group ${groupId} not found`);
      const point = new DOMPoint(px, py);
      const a = point.matrixTransform(groupCtm);
      const b = point.matrixTransform(svgCtm);
      return Math.hypot(a.x - b.x, a.y - b.y);
    },
    { groupId: id, px: x, py: y },
  );
}

// The mascot sits at the top of the page, so its scroll range at 375x812 is only about 260 px.
// Headless Chromium applies a wheel step at once. The steps must stay inside that range:
// otherwise the last scroll update comes early and the mascot is already settling at the reading.
const WHEEL_STEP_PX = 80;
const WHEEL_COUNT = 3;
const WHEEL_GAP_MS = 30;

async function wheelDown(page: Page) {
  await page.mouse.move(MOBILE.width / 2, MOBILE.height / 2);
  for (let i = 0; i < WHEEL_COUNT; i++) {
    await page.mouse.wheel(0, WHEEL_STEP_PX);
    await page.waitForTimeout(WHEEL_GAP_MS);
  }
}

/** Records the angle of the first `transform` write on each mascot group from now on. */
async function recordFirstWrites(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __firstAngle: Record<string, number> };
    w.__firstAngle = {};
    for (const id of ["head", "rice"]) {
      const group = document.querySelector(`svg[data-mascot] g#${id}`);
      if (!group) throw new Error(`mascot group ${id} not found`);
      const setAttribute = group.setAttribute.bind(group);
      group.setAttribute = (name: string, value: string) => {
        const match = /^matrix\(([^,]+),([^,]+),/.exec(value);
        if (name === "transform" && match && !(id in w.__firstAngle)) {
          w.__firstAngle[id] = (Math.atan2(Number(match[2]), Number(match[1])) * 180) / Math.PI;
        }
        setAttribute(name, value);
      };
    }
  });
  return () =>
    page.evaluate(() => (window as unknown as { __firstAngle: Record<string, number> }).__firstAngle);
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

test("the mascot tilts while scrolling and settles after", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await wheelDown(page);
  const head = await rotationOf(page, "head");
  const rice = await rotationOf(page, "rice");
  expect(Math.abs(head)).toBeGreaterThan(0.5);
  expect(Math.abs(head)).toBeLessThanOrEqual(HEAD_LIMIT_DEG);
  expect(Math.abs(rice)).toBeLessThanOrEqual(RICE_LIMIT_DEG);
  expect(await pivotDrift(page, "head", HEAD_PIVOT.x, HEAD_PIVOT.y)).toBeLessThan(1);
  expect(await pivotDrift(page, "rice", RICE_PIVOT.x, RICE_PIVOT.y)).toBeLessThan(1);
  await page.waitForTimeout(2500);
  expect(Math.abs(await rotationOf(page, "head"))).toBeLessThan(0.1);
  expect(Math.abs(await rotationOf(page, "rice"))).toBeLessThan(0.1);
});

test("very fast scrolling stays within the limits", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("End");
    await page.keyboard.press("Home");
  }
  for (let i = 0; i < 10; i++) {
    expect(Math.abs(await rotationOf(page, "head"))).toBeLessThanOrEqual(HEAD_LIMIT_DEG);
    expect(Math.abs(await rotationOf(page, "rice"))).toBeLessThanOrEqual(RICE_LIMIT_DEG);
    await page.waitForTimeout(50);
  }
});

test("turning reduced motion on puts a tilted mascot back at 0 degrees", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await wheelDown(page);
  expect(Math.abs(await rotationOf(page, "head"))).toBeGreaterThan(0.5);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForSelector("html:not([data-motion])");
  // With reduced motion, globals.css gives every property a 0.01 ms transition. The reverted
  // transform therefore shows from the next animation frame on, not in the same task.
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(Math.abs(await rotationOf(page, "head"))).toBe(0);
  expect(Math.abs(await rotationOf(page, "rice"))).toBe(0);
});

test("a new scroll after the mascot settled starts from the current angle", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await wheelDown(page);
  await page.waitForTimeout(2500);
  const firstWrites = await recordFirstWrites(page);
  // Back up inside the mascot range; the first update writes the start of the new follow.
  await page.mouse.wheel(0, -WHEEL_STEP_PX);
  await expect.poll(async () => Object.keys(await firstWrites()).length).toBe(2);
  const first = await firstWrites();
  expect(Math.abs(first.head)).toBeLessThan(0.1);
  expect(Math.abs(first.rice)).toBeLessThan(0.1);
});

test("turning reduced motion off again tilts the mascot about the same pivots", async ({ page }) => {
  await page.setViewportSize(MOBILE);
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForSelector("html:not([data-motion])");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForSelector(MOTION_ON);
  await wheelDown(page);
  expect(Math.abs(await rotationOf(page, "head"))).toBeGreaterThan(0.5);
  expect(await pivotDrift(page, "head", HEAD_PIVOT.x, HEAD_PIVOT.y)).toBeLessThan(1);
  expect(await pivotDrift(page, "rice", RICE_PIVOT.x, RICE_PIVOT.y)).toBeLessThan(1);
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

  test("reduced motion: the mascot does not move", async ({ page }) => {
    await page.setViewportSize(MOBILE);
    await page.goto("/vi");
    await page.waitForTimeout(3000);
    await wheelDown(page);
    expect(Math.abs(await rotationOf(page, "head"))).toBe(0);
    expect(Math.abs(await rotationOf(page, "rice"))).toBe(0);
  });
});

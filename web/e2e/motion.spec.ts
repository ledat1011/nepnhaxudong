import { expect, test, type Page, type Response } from "@playwright/test";
import { BRAND } from "../src/lib/brand/colors";

const MOTION_ON = "html[data-motion='on']";
const SCROLL_STEP_PX = 400;

async function scrollThroughPage(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  // The scroll takes longer as the home page grows, so the test gets that time on top of its limit.
  const steps = Math.floor(height / SCROLL_STEP_PX) + 1;
  test.info().setTimeout(test.info().timeout + steps * 250 + 1000);
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
    // The time the response arrived, not the later time its body has been read.
    const at = Date.now();
    pending.push(
      response
        .text()
        .then((body) => {
          bodies.push({ url: response.url(), body, at });
        })
        .catch(() => undefined),
    );
  });
  return { bodies, settle: () => Promise.all(pending) };
}

const JOURNEY_LEAD_PX = 600;
const GROWN_SCALE = 0.99;

/** The vertical scale (`d` of the matrix) of an element; 1 when it has no transform. */
async function scaleYOf(page: Page, selector: string) {
  return page.$eval(selector, (el) => {
    const transform = getComputedStyle(el).transform;
    if (transform === "none") return 1;
    return new DOMMatrix(transform).d;
  });
}

async function scrollToJourney(page: Page) {
  await page.evaluate((lead) => {
    document.getElementById("hanh-trinh")?.scrollIntoView({ behavior: "instant" });
    window.scrollBy({ top: -lead, behavior: "instant" });
  }, JOURNEY_LEAD_PX);
  await page.waitForTimeout(500);
}

function plantScales(page: Page) {
  return page.$$eval("[data-journey-leaf], [data-journey-ear]", (els) =>
    els.map((el) => {
      const transform = getComputedStyle(el).transform;
      return transform === "none" ? 1 : new DOMMatrix(transform).a;
    }),
  );
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
// The steps must stay inside that range, so that every step gives a scroll update.
const WHEEL_STEP_PX = 80;
const WHEEL_COUNT = 3;
const WHEEL_GAP_MS = 30;
const PAUSE_AHEAD_MS = 100;
const SETTLE_WAIT_MS = 2500;
// The settle starts 150 ms after the last scroll update; this is a little later.
const SETTLE_RUNNING_MS = 160;
const PAUSE_ATTEMPTS = 5;

/** Pauses the page time (Date, performance.now, requestAnimationFrame) a moment from now. */
async function pauseClock(page: Page) {
  for (let attempt = 1; ; attempt++) {
    const now = await page.evaluate(() => Date.now());
    try {
      await page.clock.pauseAt(now + PAUSE_AHEAD_MS);
      return;
    } catch (error) {
      // On a slow machine the running clock can pass `now + PAUSE_AHEAD_MS` before the pause
      // arrives; then read the time again.
      if (attempt >= PAUSE_ATTEMPTS || !String(error).includes("to the past")) throw error;
    }
  }
}

/**
 * Opens the home page at phone size and pauses the page time once the motion runs.
 * GSAP's ticker and ScrollTrigger's velocity use that time, so the tests move it forward in
 * fixed steps and read the mascot while it stands still: no reading depends on machine speed.
 */
async function openWithPausedClock(page: Page) {
  await openWithClock(page);
  await pauseClock(page);
}

/** Opens the home page at phone size with a fake page clock that still runs. */
async function openWithClock(page: Page) {
  await page.clock.install();
  await page.setViewportSize(MOBILE);
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
}

/** Scrolls by `deltaY`, waits until the page has moved, then lets the page time run one gap. */
async function wheelStep(page: Page, deltaY: number) {
  const before = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, deltaY);
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(Math.max(0, before + deltaY));
  await page.clock.runFor(WHEEL_GAP_MS);
}

/** Needs `page.clock.install()` first. */
async function wheelDown(page: Page) {
  await page.mouse.move(MOBILE.width / 2, MOBILE.height / 2);
  for (let i = 0; i < WHEEL_COUNT; i++) {
    await wheelStep(page, WHEEL_STEP_PX);
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
    page.evaluate(
      () => (window as unknown as { __firstAngle: Record<string, number> }).__firstAngle,
    );
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

const TARGET_TOP_MAX_PX = 150;

/** Waits until the jump to the anchor has stopped, then returns the target's top edge. */
async function settledTargetTop(page: Page, id: string) {
  let previous = -1;
  for (let i = 0; i < 50; i++) {
    const current = await page.evaluate(() => window.scrollY);
    if (current === previous && current > 0) break;
    previous = current;
    await page.waitForTimeout(100);
  }
  return page.evaluate((targetId) => {
    const top = document.getElementById(targetId)?.getBoundingClientRect().top;
    return { top, scrollY: window.scrollY };
  }, id);
}

function visibleOpacities(page: Page, selector: string) {
  return page.$$eval(selector, (els) =>
    els
      .filter((el) => el.getBoundingClientRect().top < window.innerHeight)
      .map((el) => getComputedStyle(el).opacity),
  );
}

test("a deep link keeps the sections above and in view visible", async ({ page }) => {
  await page.goto("/vi#bao-chi");
  await page.waitForSelector(MOTION_ON);
  const { top, scrollY } = await settledTargetTop(page, "bao-chi");
  expect(scrollY).toBeGreaterThan(0);
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(TARGET_TOP_MAX_PX);
  const opacities = await visibleOpacities(page, "[data-reveal]");
  expect(opacities.length).toBeGreaterThan(0);
  expect(opacities.every((opacity) => opacity === "1")).toBe(true);
});

test("a deep link into the journey lands on it and keeps what is in view visible", async ({
  page,
}) => {
  await page.goto("/vi#hanh-trinh");
  await page.waitForSelector(MOTION_ON);
  const { top, scrollY } = await settledTargetTop(page, "hanh-trinh");
  expect(scrollY).toBeGreaterThan(0);
  expect(top).toBeGreaterThanOrEqual(0);
  expect(top).toBeLessThan(TARGET_TOP_MAX_PX);
  expect(await scaleYOf(page, "[data-journey-line]")).toBeGreaterThan(GROWN_SCALE);
  const events = await visibleOpacities(page, "[data-journey-event]");
  expect(events.length).toBeGreaterThan(0);
  expect(events.every((opacity) => opacity === "1")).toBe(true);
  const leafScales = await page.$$eval("[data-journey-leaf]", (els) =>
    els
      .filter(
        (el) =>
          el.closest("[data-journey-event]")!.getBoundingClientRect().top < window.innerHeight,
      )
      .map((el) => {
        const transform = getComputedStyle(el).transform;
        return transform === "none" ? 1 : new DOMMatrix(transform).a;
      }),
  );
  expect(leafScales.length).toBeGreaterThan(0);
  expect(leafScales.every((scale) => scale > GROWN_SCALE)).toBe(true);
});

test("the contact block at the end of the page appears", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  const contact = "section[aria-labelledby='lien-he'] [data-reveal]";
  expect((await revealOpacities(page, contact)).every((opacity) => opacity === "0")).toBe(true);
  await page.keyboard.press("End");
  // The reveal runs when the scroll reaches the block; on a busy machine that takes a while.
  await expect
    .poll(async () => (await revealOpacities(page, contact)).every((opacity) => opacity === "1"))
    .toBe(true);
  expect((await revealOpacities(page, contact)).length).toBeGreaterThan(0);
});

const SCROLL_TARGET_FROM_END_PX = 200;
const LEAF_TIP_MARGIN_PX = 30;

test("a smooth scroll that runs while the motion starts reaches its target", async ({ page }) => {
  // Hold the GSAP chunk until the smooth scroll runs, so the motion starts during the scroll.
  let releaseGsap = () => {};
  const gsapReleased = new Promise<void>((resolve) => {
    releaseGsap = resolve;
  });
  let gsapRequested = false;
  await page.route(/\.js(\?|$)/, async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    if (body.includes("_gsap")) {
      gsapRequested = true;
      await gsapReleased;
    }
    await route.fulfill({ response, body });
  });
  await page.goto("/vi");
  await expect.poll(() => gsapRequested).toBe(true);
  const target = await page.evaluate((fromEnd) => {
    const top = document.documentElement.scrollHeight - window.innerHeight - fromEnd;
    window.scrollTo({ top, behavior: "smooth" });
    return top;
  }, SCROLL_TARGET_FROM_END_PX);
  releaseGsap();
  await page.waitForSelector(MOTION_ON);
  await expect
    .poll(() => page.evaluate((top) => Math.abs(window.scrollY - top), target))
    .toBeLessThan(1);
});

test("a journey leaf grows out of the stem tip, not below it", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await scrollToJourney(page);
  // A hidden leaf has scale 0 about its joint, so its box is the joint point itself.
  const joint = await page.$eval("[data-journey-leaf]", (el) => {
    const transform = getComputedStyle(el).transform;
    if (transform === "none" || new DOMMatrix(transform).a !== 0) return null;
    return el.getBoundingClientRect().bottom + window.scrollY;
  });
  expect(joint).not.toBeNull();
  const stemTipAt = async (offsetPx: number) => {
    await page.evaluate(
      ({ y, offset }) => window.scrollTo(0, y - window.innerHeight * 0.7 + offset),
      { y: joint!, offset: offsetPx },
    );
    await page.waitForTimeout(1000);
    return page.$eval("[data-journey-leaf]", (el) => {
      const transform = getComputedStyle(el).transform;
      return transform === "none" ? 1 : new DOMMatrix(transform).a;
    });
  };
  // The stem tip is still above the joint: no leaf yet.
  expect(await stemTipAt(-LEAF_TIP_MARGIN_PX)).toBe(0);
  // The stem tip has passed the joint: the leaf has grown.
  expect(await stemTipAt(LEAF_TIP_MARGIN_PX)).toBeGreaterThan(GROWN_SCALE);
});

// The mock content has no product image, so the lightbox cannot be opened here. The lightbox is a
// non-portal `fixed inset-0` element inside the revealed block, so this test puts the same kind
// of element in that block and checks that it still covers the whole screen.
test("a fixed overlay inside the revealed gallery block covers the whole screen", async ({
  page,
}) => {
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
  expect(box).toEqual({
    x: 0,
    y: 0,
    width: viewport?.width,
    height: viewport?.height,
  });
});

// The spec asks that the LCP on a phone (Lighthouse mobile) stays the brand name. The hero scene
// must not take it: inline svg is not an LCP candidate, an <img> or a CSS background image would be.
// On a 1280 x 800 desktop screen the product text below the shorter hero is also in the first
// screen and its block is larger than the brand name, so there the LCP may be that text. What
// matters on both sizes is that the LCP is text from the server HTML, not a picture.
async function largestPaint(page: Page) {
  return page.evaluate(
    () =>
      new Promise<{ tag: string; inH1: boolean; text: string }>((resolve) => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries() as (PerformanceEntry & { element: Element | null })[];
          const last = entries.at(-1);
          const el = last?.element ?? null;
          resolve({
            tag: el?.tagName.toLowerCase() ?? "none",
            inH1: el?.closest("h1") !== null && el !== null,
            text: el?.textContent?.trim().slice(0, 20) ?? "",
          });
        }).observe({ type: "largest-contentful-paint", buffered: true });
      }),
  );
}

test("the largest contentful paint is text, not a picture, at 1280 px", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  const lcp = await largestPaint(page);
  expect(["img", "image", "svg", "video", "none"], JSON.stringify(lcp)).not.toContain(lcp.tag);
  expect(lcp.text.length, JSON.stringify(lcp)).toBeGreaterThan(0);
});

for (const viewport of [{ width: 375, height: 812 }]) {
  test(`the largest contentful paint is the brand name at ${viewport.width} px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/vi");
    await page.waitForSelector(MOTION_ON);
    const lcp = await largestPaint(page);
    expect(lcp.inH1, JSON.stringify(lcp)).toBe(true);
  });
}

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
  // The attribute goes before GSAP has put every inline style back, and with reduced motion globals.css gives
  // every property a 0.01 ms CSS transition, so the first read can still see a block mid-revert. Poll for the end state.
  await expect
    .poll(async () => (await revealOpacities(page)).every((opacity) => opacity === "1"))
    .toBe(true);
});

test("the mascot tilts while scrolling and settles after", async ({ page }) => {
  await openWithPausedClock(page);
  await wheelDown(page);
  const head = await rotationOf(page, "head");
  const rice = await rotationOf(page, "rice");
  expect(Math.abs(head)).toBeGreaterThan(0.5);
  expect(Math.abs(head)).toBeLessThanOrEqual(HEAD_LIMIT_DEG);
  expect(Math.abs(rice)).toBeLessThanOrEqual(RICE_LIMIT_DEG);
  expect(await pivotDrift(page, "head", HEAD_PIVOT.x, HEAD_PIVOT.y)).toBeLessThan(1);
  expect(await pivotDrift(page, "rice", RICE_PIVOT.x, RICE_PIVOT.y)).toBeLessThan(1);
  await page.clock.runFor(SETTLE_WAIT_MS);
  expect(Math.abs(await rotationOf(page, "head"))).toBeLessThan(0.1);
  expect(Math.abs(await rotationOf(page, "rice"))).toBeLessThan(0.1);
});

test("very fast scrolling stays within the limits and settles after", async ({ page }) => {
  await openWithClock(page);
  for (let i = 0; i < 3; i++) {
    await page.keyboard.press("End");
    await page.keyboard.press("Home");
  }
  for (let i = 0; i < 10; i++) {
    expect(Math.abs(await rotationOf(page, "head"))).toBeLessThanOrEqual(HEAD_LIMIT_DEG);
    expect(Math.abs(await rotationOf(page, "rice"))).toBeLessThanOrEqual(RICE_LIMIT_DEG);
    await page.waitForTimeout(50);
  }
  // The page must stand still before the time is paused: a later scroll would tilt it again.
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await pauseClock(page);
  await page.clock.runFor(SETTLE_WAIT_MS);
  expect(Math.abs(await rotationOf(page, "head"))).toBeLessThan(0.1);
  expect(Math.abs(await rotationOf(page, "rice"))).toBeLessThan(0.1);
});

test("turning reduced motion on puts a tilted mascot back at 0 degrees", async ({ page }) => {
  await openWithPausedClock(page);
  await wheelDown(page);
  // Revert while the settle tween is running, not only while the follow tweens are.
  await page.clock.runFor(SETTLE_RUNNING_MS);
  expect(Math.abs(await rotationOf(page, "head"))).toBeGreaterThan(0.5);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForSelector("html:not([data-motion])");
  // The page time is paused, so no tween can bring the angle to 0: only the revert can.
  // With reduced motion, globals.css gives every property a 0.01 ms CSS transition, so the
  // reverted transform shows from the next rendered frame on. Poll for it.
  await expect.poll(async () => Math.abs(await rotationOf(page, "head"))).toBe(0);
  await expect.poll(async () => Math.abs(await rotationOf(page, "rice"))).toBe(0);
});

test("a new scroll after the mascot settled starts from the current angle", async ({ page }) => {
  await openWithPausedClock(page);
  await wheelDown(page);
  await page.clock.runFor(SETTLE_WAIT_MS);
  const firstWrites = await recordFirstWrites(page);
  // Back up inside the mascot range; the first update writes the start of the new follow.
  await wheelStep(page, -WHEEL_STEP_PX);
  const first = await firstWrites();
  expect(Object.keys(first)).toHaveLength(2);
  expect(Math.abs(first.head)).toBeLessThan(0.1);
  expect(Math.abs(first.rice)).toBeLessThan(0.1);
});

test("turning reduced motion off again tilts the mascot about the same pivots", async ({
  page,
}) => {
  await openWithClock(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForSelector("html:not([data-motion])");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  // GSAP starts the motion again from its ticker, so the clock is paused only after that.
  await page.waitForSelector(MOTION_ON);
  await pauseClock(page);
  await wheelDown(page);
  expect(Math.abs(await rotationOf(page, "head"))).toBeGreaterThan(0.5);
  expect(await pivotDrift(page, "head", HEAD_PIVOT.x, HEAD_PIVOT.y)).toBeLessThan(1);
  expect(await pivotDrift(page, "rice", RICE_PIVOT.x, RICE_PIVOT.y)).toBeLessThan(1);
});

test("the rice plant grows with the journey and every event appears", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await scrollToJourney(page);
  expect(await scaleYOf(page, "[data-journey-line]")).toBeLessThan(0.5);
  await scrollThroughPage(page);
  expect(await scaleYOf(page, "[data-journey-line]")).toBeGreaterThan(GROWN_SCALE);
  expect((await revealOpacities(page, "[data-journey-event]")).every((o) => o === "1")).toBe(true);
  const scales = await plantScales(page);
  expect(scales.length).toBeGreaterThan(1);
  expect(scales.every((scale) => scale > GROWN_SCALE)).toBe(true);
});

test("turning reduced motion on makes the plant fully grown", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await scrollToJourney(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForSelector("html:not([data-motion])");
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
  expect(await page.$eval("[data-journey-line]", (el) => getComputedStyle(el).transform)).toBe(
    "none",
  );
  expect((await revealOpacities(page, "[data-journey-event]")).every((o) => o === "1")).toBe(true);
  expect((await plantScales(page)).every((scale) => scale > GROWN_SCALE)).toBe(true);
});

test("the plant does not widen the page at 320 px", async ({ page }) => {
  // The page is long at 320 px (the story scenes stack), so the slow scroll needs more time.
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await scrollThroughPage(page);
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(320);
});

const FIRST_CLOUD = "[data-hero-cloud]";

function cloudTransform(page: Page) {
  return page.$eval(FIRST_CLOUD, (el) => getComputedStyle(el).transform);
}

test("the hero clouds move and the pause button stops them", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  const pause = page.getByRole("button", { name: "Tạm dừng chuyển động" }).first();
  await expect(pause).toBeVisible();
  const first = await cloudTransform(page);
  await page.waitForTimeout(1000);
  expect(await cloudTransform(page)).not.toBe(first);

  await pause.click();
  // A toggle button keeps its name and title; aria-pressed carries the state.
  await expect(pause).toHaveAttribute("aria-pressed", "true");
  await expect(pause).toHaveAttribute("title", "Tạm dừng chuyển động");
  const stopped = await cloudTransform(page);
  await page.waitForTimeout(1000);
  expect(await cloudTransform(page)).toBe(stopped);
});

test("the paused choice survives a reload", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await page.getByRole("button", { name: "Tạm dừng chuyển động" }).first().click();
  await page.reload();
  await page.waitForSelector(MOTION_ON);
  await expect(
    page.getByRole("button", { name: "Tạm dừng chuyển động", pressed: true }).first(),
  ).toBeVisible();
  const before = await cloudTransform(page);
  await page.waitForTimeout(1000);
  expect(await cloudTransform(page)).toBe(before);
});

test("the pause button has a Nâu đất focus ring between two Trắng gạo bands", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  const pause = page.getByRole("button", { name: "Tạm dừng chuyển động" }).first();
  // Reach the button with the keyboard, so :focus-visible applies.
  await pause.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  const ring = await pause.evaluate((el) => {
    const style = getComputedStyle(el);
    return {
      focusVisible: el.matches(":focus-visible"),
      outlineStyle: style.outlineStyle,
      outlineColor: style.outlineColor,
      outlineWidth: style.outlineWidth,
      outlineOffset: style.outlineOffset,
      boxShadow: style.boxShadow,
    };
  });
  expect(ring.focusVisible).toBe(true);
  expect(ring.outlineStyle).toBe("solid");
  expect(ring.outlineColor).toBe("rgb(74, 44, 26)");
  expect(ring.outlineWidth).toBe("2px");
  expect(ring.outlineOffset).toBe("2px");
  expect(ring.boxShadow).toContain("rgb(251, 247, 238) 0px 0px 0px 6px");
});

type Box = { left: number; top: number; right: number; bottom: number };

function overlaps(a: Box, b: Box) {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

async function heroBoxes(page: Page) {
  return page.evaluate(() => {
    const box = (el: Element | null) => {
      if (!el) throw new Error("hero element not found");
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
    };
    const hero = document.querySelector("[data-hero-scene]");
    return {
      hero: box(hero),
      panel: box(document.querySelector("[data-hero-panel]")),
      mascot: box(document.querySelector("svg[data-mascot]")),
      pause: box(hero?.querySelector("button[aria-pressed]") ?? null),
      links: Array.from(hero?.querySelectorAll("a[href]") ?? []).map(box),
    };
  });
}

for (const viewport of [
  { width: 320, height: 640 },
  { width: 375, height: 812 },
  { width: 767, height: 1024 },
]) {
  test(`on a ${viewport.width} px phone the pause button sits in the scene corner`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/vi");
    await page.waitForSelector(MOTION_ON);
    const { panel, mascot, pause, links } = await heroBoxes(page);
    // Inside the bottom-right corner of the scene band.
    expect(pause.top).toBeGreaterThanOrEqual(panel.top + (panel.bottom - panel.top) / 2);
    expect(pause.bottom).toBeLessThanOrEqual(panel.bottom);
    expect(pause.right).toBeLessThanOrEqual(panel.right);
    expect(pause.left).toBeGreaterThanOrEqual((panel.left + panel.right) / 2);
    // Never over the mascot or a button.
    expect(overlaps(pause, mascot)).toBe(false);
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) expect(overlaps(pause, link)).toBe(false);
  });
}

test("on a desktop the pause button stays in the bottom-right corner of the hero", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  const { hero, mascot, pause, links } = await heroBoxes(page);
  expect(hero.bottom - pause.bottom).toBeCloseTo(16, 0);
  expect(hero.right - pause.right).toBeGreaterThanOrEqual(16);
  expect(overlaps(pause, mascot)).toBe(false);
  for (const link of links) expect(overlaps(pause, link)).toBe(false);
});

test("reduced motion hides the pause button and leaves the clouds still", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/vi");
  await page.waitForTimeout(1500);
  await expect(page.getByRole("button", { name: /chuyển động/ })).toBeHidden();
  expect(await cloudTransform(page)).toBe("none");
});

const IDENTITY = ["none", "matrix(1, 0, 0, 1, 0, 0)"];

function bagState(page: Page) {
  return page.evaluate(() => {
    const style = (name: string) => {
      const el = document.querySelector(`[data-product-bag] [data-bag='${name}']`);
      if (!el) throw new Error(`bag part ${name} not found`);
      return getComputedStyle(el);
    };
    const figure = document.querySelector("[data-product-bag]") as HTMLElement;
    return {
      top: figure.getBoundingClientRect().top,
      line: window.innerHeight * 0.75,
      puffy: style("puffy").opacity,
      label: style("label").transform,
      notes: Array.from(document.querySelectorAll("[data-bag-note]")).map(
        (el) => getComputedStyle(el).opacity,
      ),
    };
  });
}

async function expectBagFinalFrame(page: Page) {
  const state = await bagState(page);
  expect(state.puffy).toBe("0");
  expect(IDENTITY).toContain(state.label);
  expect(state.notes).toHaveLength(3);
  expect(state.notes.every((o) => o === "1")).toBe(true);
}

/** Records the bag's `puffy` opacity on every frame from the first paint on. */
async function recordPuffy(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __puffy: number[] };
    w.__puffy = [];
    const tick = () => {
      const el = document.querySelector("[data-product-bag] [data-bag='puffy']");
      if (el) w.__puffy.push(Number(getComputedStyle(el).opacity));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  return () => page.evaluate(() => (window as unknown as { __puffy: number[] }).__puffy);
}

// The bag shows its final frame from the first paint; the motion unpacks it and packs it back,
// so the first and the last frame are the same and no frame jumps. At 1440x900 the bag is
// already past the trigger line when the motion starts, so it plays at once.
for (const viewport of [
  { width: 1280, height: 720 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 375, height: 812 },
]) {
  test(`the bag plays from and back to its final frame at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const puffy = await recordPuffy(page);
    await page.goto("/vi");
    await page.waitForSelector(MOTION_ON);
    await page.evaluate(() => {
      const figure = document.querySelector("[data-product-bag]") as HTMLElement;
      const down = figure.getBoundingClientRect().top - window.innerHeight * 0.5;
      if (down > 0) window.scrollBy({ top: down, behavior: "instant" });
    });
    await page.waitForTimeout(4000);
    await expectBagFinalFrame(page);
    const samples = await puffy();
    expect(samples.length).toBeGreaterThan(30);
    // The first painted frame is the final frame: the loose bag is hidden.
    expect(samples[0]).toBe(0);
    // The motion ran: the loose bag showed in the middle of it.
    expect(Math.max(...samples)).toBeGreaterThan(0.9);
    // No jump: a 0.35 s fade moves less than half of its range between two frames.
    for (let i = 1; i < samples.length; i++) {
      expect(Math.abs(samples[i] - samples[i - 1]), `frame ${i}`).toBeLessThan(0.5);
    }
  });
}

test("the bag animation ends in the static final frame", async ({ page }) => {
  await page.goto("/vi");
  await page.waitForSelector(MOTION_ON);
  await page.locator("[data-product-bag]").first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(4000);
  await expectBagFinalFrame(page);
  // The falling grains keep their own rotation: grain 0 is turned -20 degrees.
  const grain = await page.$eval(
    "[data-bag='grains'] ellipse",
    (el) => getComputedStyle(el).transform,
  );
  const [a, b] = grain
    .replace(/matrix\(|\)/g, "")
    .split(",")
    .map(Number);
  expect(Math.atan2(b, a) * (180 / Math.PI)).toBeCloseTo(-20, 0);
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
    await page.clock.install();
    await page.setViewportSize(MOBILE);
    await page.goto("/vi");
    await page.waitForTimeout(3000);
    await wheelDown(page);
    expect(Math.abs(await rotationOf(page, "head"))).toBe(0);
    expect(Math.abs(await rotationOf(page, "rice"))).toBe(0);
  });
  test("reduced motion: the plant is fully grown", async ({ page }) => {
    await page.goto("/vi");
    await scrollToJourney(page);
    expect(await page.$eval("[data-journey-line]", (el) => getComputedStyle(el).transform)).toBe(
      "none",
    );
    expect((await revealOpacities(page, "[data-journey-event]")).every((o) => o === "1")).toBe(
      true,
    );
    expect((await plantScales(page)).every((scale) => scale === 1)).toBe(true);
  });
  test("reduced motion: the bag notes are visible at once", async ({ page }) => {
    await page.goto("/vi");
    await page.locator("[data-product-bag]").first().scrollIntoViewIfNeeded();
    const notes = await revealOpacities(page, "[data-bag-note]");
    expect(notes).toHaveLength(3);
    expect(notes.every((o) => o === "1")).toBe(true);
  });
});

test.describe("the rice story road", () => {
  const PHONE = { width: 390, height: 844 };
  const DESKTOP = { width: 1280, height: 800 };
  const SCENES = "li[data-story-scene]";

  async function openStory(page: Page, viewport: { width: number; height: number }) {
    await page.setViewportSize(viewport);
    await page.goto("/vi");
    await page.waitForSelector(MOTION_ON, { state: "attached" });
  }

  /** Scrolls through the story in steps, so every scene passes its trigger line. */
  async function scrollThroughStory(page: Page) {
    const { top, height } = await page.$eval("[data-rice-story]", (el) => {
      const box = el.getBoundingClientRect();
      return { top: box.top + window.scrollY, height: box.height };
    });
    for (let y = top - 1000; y <= top + height; y += 300) {
      await page.evaluate((to) => window.scrollTo({ top: to, behavior: "instant" }), y);
      await page.waitForTimeout(120);
    }
  }

  /** Scrolls until scene `index` has its top at 40 % of the screen. */
  async function scrollToScene(page: Page, index: number) {
    await page.evaluate((i) => {
      const li = document.querySelectorAll("li[data-story-scene]")[i];
      window.scrollBy({ top: li.getBoundingClientRect().top - window.innerHeight * 0.4, behavior: "instant" });
    }, index);
  }

  const boxes = (page: Page, selector: string) =>
    page.$$eval(selector, (els) =>
      els.map((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, top: r.top, center: r.left + r.width / 2 };
      }),
    );

  test("phone: the road runs on the left and the scenes stack to its right", async ({ page }) => {
    await openStory(page, PHONE);
    await scrollThroughStory(page);
    expect(await page.locator(".pin-spacer").count()).toBe(0);
    const labels = await boxes(page, `${SCENES} [data-story-step]`);
    const stops = await boxes(page, `${SCENES} > [data-story-stop]`);
    expect(labels).toHaveLength(8);
    for (let i = 0; i < 8; i++) {
      expect(stops[i].right).toBeLessThan(labels[i].left);
      expect(labels[i].left).toBeCloseTo(labels[0].left, 0);
      if (i > 0) expect(labels[i].top).toBeGreaterThan(labels[i - 1].top);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(PHONE.width);
    // Each sketch stays in its stage, with its layer of moving parts over it (decision 0017).
    await expect(page.locator(`${SCENES} [data-story-stage] > img`)).toHaveCount(8);
    await expect(page.locator(`${SCENES} [data-story-overlay]`)).toHaveCount(8);
  });

  test("desktop: the scenes take turns left and right of the road, nothing is pinned", async ({
    page,
  }) => {
    await openStory(page, DESKTOP);
    await scrollThroughStory(page);
    expect(await page.locator(".pin-spacer").count()).toBe(0);
    const scenes = await boxes(page, SCENES);
    scenes.forEach((scene, i) => {
      if (i % 2 === 0) expect(scene.center).toBeLessThan(DESKTOP.width / 2);
      else expect(scene.center).toBeGreaterThan(DESKTOP.width / 2);
    });
    // Each scene stands next to the road, on its own side, 64 px from the middle.
    const contents = await boxes(page, `${SCENES} [data-story-content]`);
    contents.forEach((content, i) => {
      const gap = i % 2 === 0 ? DESKTOP.width / 2 - content.right : content.left - DESKTOP.width / 2;
      expect(gap).toBeGreaterThan(40);
      expect(gap).toBeLessThan(90);
    });
    // The owner asked for a shorter section (it was about 4800 px at 1280), then for wider pictures.
    const height = await page.$eval("[data-rice-story]", (el) => el.getBoundingClientRect().height);
    expect(height).toBeLessThan(4500);
  });

  test("desktop: the grain moves down the road and the stop in view fills", async ({ page }) => {
    await openStory(page, DESKTOP);
    const grainY = () =>
      page.$eval("[data-story-grain]", (el) => {
        const wrap = el.parentElement?.getBoundingClientRect().top ?? 0;
        return el.getBoundingClientRect().top - wrap;
      });
    const activeStop = () =>
      page.$$eval("[data-story-stop]", (els) => els.findIndex((el) => el.hasAttribute("data-active")));
    const activeStops = () => page.locator("[data-story-stop][data-active]").count();
    await scrollToScene(page, 1);
    await page.waitForTimeout(1500);
    expect(await page.$eval("[data-story-grain]", (el) => getComputedStyle(el).opacity)).toBe("1");
    const first = await grainY();
    expect(await activeStop()).toBe(1);
    // From 768 px the scenes overlap, and still only one stop is filled at a time.
    expect(await activeStops()).toBe(1);
    await scrollToScene(page, 4);
    await page.waitForTimeout(1500);
    expect(await grainY()).toBeGreaterThan(first + 500);
    expect(await activeStop()).toBe(4);
    expect(await activeStops()).toBe(1);
    // The road above the grain is darker: the passed layer of an earlier stretch is shown whole.
    const passed = await page.$eval(
      "li[data-story-scene]:nth-child(2) [data-story-road-passed]",
      (el) => getComputedStyle(el).transform,
    );
    expect(IDENTITY).toContain(passed);
    // The darker road is Vàng lúa, inside the Vàng rơm road.
    const passedStroke = await page.$eval(
      "li[data-story-scene]:nth-child(2) [data-story-road-passed] path",
      (el) => el.getAttribute("stroke"),
    );
    expect(passedStroke?.toUpperCase()).toBe(BRAND.grain.toUpperCase());

    // Back up the page, the grain goes back up the road.
    const down = await grainY();
    await scrollToScene(page, 1);
    await page.waitForTimeout(1500);
    expect(await grainY()).toBeLessThan(down - 500);
    expect(await activeStop()).toBe(1);
  });

  test("resizing from desktop to phone keeps the road timeline", async ({ page }) => {
    await openStory(page, DESKTOP);
    await scrollToScene(page, 3);
    await page.waitForTimeout(500);
    await page.setViewportSize(PHONE);
    await page.waitForTimeout(800);
    expect(await page.locator(".pin-spacer").count()).toBe(0);
    const labels = await boxes(page, `${SCENES} [data-story-step]`);
    labels.forEach((label) => expect(label.left).toBeCloseTo(labels[0].left, 0));
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(PHONE.width);
    await page.evaluate(() =>
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "instant" }),
    );
    await expect(page.locator("footer")).toBeInViewport();
  });

  test("loads a scene's layers only near it, and keeps the still sketch when one fails", async ({
    page,
  }) => {
    const requested: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("/lop/")) requested.push(new URL(request.url()).pathname);
    });
    await page.route("**/lop/say-fan.webp", (route) => route.fulfill({ status: 500, body: "" }));
    await openStory(page, PHONE);
    // At the top of the page no layer has loaded yet.
    expect(requested).toEqual([]);
    await scrollThroughStory(page);
    expect(requested.length).toBeGreaterThan(0);
    await expect(page.locator(`${SCENES} [data-story-overlay]`)).toHaveCount(7);
    await expect(page.locator("li[data-story-scene='say'] [data-story-overlay]")).toHaveCount(0);
    await expect(page.locator("li[data-story-scene='say'] [data-story-stage] > img")).toHaveCount(1);
  });

  test("step 2 ends at night, over the sketch", async ({ page }) => {
    await openStory(page, DESKTOP);
    await scrollToScene(page, 1);
    const night = page.locator("li[data-story-scene='nang-mua-gio'] [data-part='night']");
    await expect(night).toBeAttached();
    await expect
      .poll(() => night.evaluate((el) => getComputedStyle(el).opacity), { timeout: 15000 })
      .toBe("1");
  });

  test("the skip link jumps past the story", async ({ page }) => {
    await openStory(page, DESKTOP);
    const skip = page.locator("[data-story-skip]");
    await page.locator("#tu-hat-lua").scrollIntoViewIfNeeded();
    await skip.focus();
    await expect(skip).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page.locator("#sau-cau-chuyen")).toBeFocused();
    await expect(page.locator("#sau-cau-chuyen")).toBeInViewport();
  });

  test("opening #hanh-trinh lands on the journey", async ({ page }) => {
    await page.setViewportSize(DESKTOP);
    await page.goto("/vi#hanh-trinh");
    await page.waitForSelector(MOTION_ON, { state: "attached" });
    await page.waitForTimeout(2000);
    await expect(page.locator("#hanh-trinh")).toBeInViewport();
  });

  test("sections after the story still reveal", async ({ page }) => {
    await openStory(page, DESKTOP);
    await scrollThroughStory(page);
    await page.locator("#bao-chi").scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    const press = await page.$$eval("section[aria-labelledby='bao-chi'] [data-reveal]", (els) =>
      els.map((el) => getComputedStyle(el).opacity),
    );
    expect(press.length).toBeGreaterThan(0);
    expect(press.every((o) => o === "1")).toBe(true);
  });

  test("the pause button also stops the story loops", async ({ page }) => {
    await openStory(page, PHONE);
    await page.evaluate(() => {
      const li = document.querySelector("li[data-story-scene='say']") as HTMLElement;
      window.scrollBy({ top: li.getBoundingClientRect().top - 120, behavior: "instant" });
    });
    // The intro plays first; the loop runs after it.
    await page.locator("li[data-story-scene='say'] [data-part='fan']").waitFor({ state: "attached" });
    await page.waitForTimeout(3500);
    const fan = () =>
      page.$eval("li[data-story-scene='say'] [data-part='fan']", (el) => getComputedStyle(el).transform);
    const turning = await fan();
    await page.waitForTimeout(400);
    expect(await fan()).not.toBe(turning);
    // A click without scrolling, so the scene stays on screen.
    await page
      .getByRole("button", { name: "Tạm dừng chuyển động" })
      .first()
      .evaluate((button: HTMLButtonElement) => button.click());
    const stopped = await fan();
    await page.waitForTimeout(1000);
    expect(await fan()).toBe(stopped);
  });

  for (const viewport of [{ width: 320, height: 640 }, PHONE, DESKTOP]) {
    test(`has its own pause button clear of the heading, road and pictures at ${viewport.width} px`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/en");
      await page.waitForSelector(MOTION_ON);
      const story = page.locator("[data-story-pause] button");
      await story.scrollIntoViewIfNeeded();
      await expect(story).toBeVisible();
      const hits = await story.evaluate((button) => {
        const box = button.getBoundingClientRect();
        const meets = (r: DOMRect) =>
          r.width > 0 && r.right > box.left && r.left < box.right && r.bottom > box.top && r.top < box.bottom;
        const range = document.createRange();
        range.selectNodeContents(document.getElementById("tu-hat-lua") as HTMLElement);
        const section = (document.querySelector("[data-rice-story]") as HTMLElement).getBoundingClientRect();
        return {
          heading: [...range.getClientRects()].some(meets),
          road: meets((document.querySelector("[data-story-road-wrap]") as HTMLElement).getBoundingClientRect()),
          inSection: box.top >= section.top && box.right <= section.right,
        };
      });
      expect(hits).toEqual({ heading: false, road: false, inSection: true });

      // Both buttons drive the same loops.
      await story.click();
      const hero = page.locator("[data-hero-pause] button");
      await expect(hero).toHaveAttribute("aria-pressed", "true");
      await expect(story).toHaveAttribute("aria-pressed", "true");
      await story.click();
      await expect(hero).toHaveAttribute("aria-pressed", "false");
    });
  }

  test.describe("with reduced motion", () => {
    test.use({ reducedMotion: "reduce" });

    test("shows the whole road and eight static images", async ({ page }) => {
      await page.setViewportSize(DESKTOP);
      await page.goto("/vi");
      await page.waitForTimeout(2000);
      await scrollThroughStory(page);
      // No layer of moving parts and no layer download: only the still sketches.
      await expect(page.locator(`${SCENES} [data-story-overlay]`)).toHaveCount(0);
      await expect(page.locator(`${SCENES} img`)).toHaveCount(8);
      await expect(page.locator("[data-story-road]")).toHaveCount(8);
      await expect(page.locator("[data-story-pause] button")).toBeHidden();
      expect(await page.$eval("[data-story-grain]", (el) => getComputedStyle(el).opacity)).toBe("0");
      const titles = await page.$$eval(`${SCENES} h3`, (els) =>
        els.map((el) => getComputedStyle(el).opacity),
      );
      expect(titles).toEqual(Array(8).fill("1"));
    });
  });
});

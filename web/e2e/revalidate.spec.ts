import { expect, test, type Page } from "@playwright/test";
import { FAKE_API_PORT, origin, REVALIDATE_SECRET } from "./targets.mjs";

const FAKE_API = origin(FAKE_API_PORT);
const tagline = (page: Page) => page.locator("main h1 + p");

test("content changed in the API shows after a revalidate call, and not before", async ({
  page,
  request,
}) => {
  await page.goto("/vi");
  const before = (await tagline(page).textContent()) ?? "";
  expect(before).not.toBe("");

  const changed = `[MẪU] e2e tagline ${Date.now()}`;
  const change = await request.post(`${FAKE_API}/__test/tagline`, { data: { vi: changed } });
  expect(change.ok()).toBe(true);

  // The page is cached, so it still shows the old text.
  await page.goto("/vi");
  await expect(tagline(page)).toHaveText(before);

  const wrong = await request.post("/api/revalidate", {
    headers: { "x-revalidate-secret": "not-the-secret" },
    data: { tags: ["home"] },
  });
  expect(wrong.status()).toBe(401);
  await page.goto("/vi");
  await expect(tagline(page)).toHaveText(before);

  const done = await request.post("/api/revalidate", {
    headers: { "x-revalidate-secret": REVALIDATE_SECRET },
    data: { tags: ["home"] },
  });
  expect(done.status()).toBe(200);

  // The very next load shows the new text: no stale first request.
  await page.goto("/vi");
  await expect(tagline(page)).toHaveText(changed, { timeout: 2000 });
});

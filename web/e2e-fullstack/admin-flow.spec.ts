import { writeFileSync } from "node:fs";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { ADMIN_ROUTES } from "../src/lib/admin/routes";
import { env, expectPublicText, PUBLIC_WAIT_MS, signIn } from "./helpers";
import { makeTinyJpeg } from "./make-jpeg.mjs";

// One story told in order: each test uses what the tests before it created.
test.describe.configure({ mode: "serial" });

const run = String(Math.floor(Math.random() * 1_000_000));
const EVENT_TITLE = `[E2E] Mốc ${run}`;
const EDITED_TITLE = `${EVENT_TITLE} đã sửa`;
const STORY_TITLE = `[E2E] Câu chuyện ${run}`;
const ALT_VI = `[E2E] Ảnh thử ${run}`;
const ALT_EN = `[E2E] Test image ${run}`;
const PRESS_TITLE = `[E2E] Bài báo ${run}`;
// 200 characters, ending in one long part with no place to break, as tracking links often do.
const LONG_URL = `https://baochi.example/${run}/lang-nghe-gao-nep-cai-hoa-vang-xu-dong?utm_source=`.padEnd(200, "x");
const ADDRESS_LINE = `Thôn Xuân Đông, xã Cẩm Văn, huyện Cẩm Giàng, tỉnh Hải Dương, Việt Nam`;
const LONG_ADDRESS = `[E2E] ${run} ${ADDRESS_LINE}. ${ADDRESS_LINE}. ${ADDRESS_LINE}.`;

let context: BrowserContext;
let page: Page;

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext();
  page = await context.newPage();
});

test.afterAll(async () => {
  await context.close();
});

// includeHidden: while a second dialog is open, Radix marks the dialog below it aria-hidden, but it is still on screen.
const dialog = (name: string | RegExp) => page.getByRole("dialog", { name, includeHidden: true });
const titleVi = (form: ReturnType<typeof dialog>) => form.getByRole("group", { name: /^Tiêu đề/, includeHidden: true }).getByLabel("Tiếng Việt");
// The select button of a list row reads "<year> <title>" and, while English is missing, "Thiếu EN".
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const eventRow = (title: string) =>
  page.getByRole("button", { name: new RegExp(`^2031 ${escapeRegExp(title)}( Thiếu EN)?$`) });

async function openTimelineEvent(title: string) {
  await page.goto(ADMIN_ROUTES.timeline);
  await eventRow(title).click();
  await expect(dialog("Sửa mốc")).toBeVisible();
}

test("first sign-in forces a password change, then the dashboard opens", async () => {
  await page.goto(ADMIN_ROUTES.login);
  await signIn(page, env("E2E_ADMIN_TEMP_PASSWORD"));
  await expect(page).toHaveURL(new RegExp(`${ADMIN_ROUTES.changePassword}$`));

  const newPassword = env("E2E_ADMIN_NEW_PASSWORD");
  await page.getByLabel("Mật khẩu hiện tại").fill(env("E2E_ADMIN_TEMP_PASSWORD"));
  await page.getByLabel("Mật khẩu mới", { exact: true }).fill(newPassword);
  await page.getByLabel("Nhập lại mật khẩu mới").fill(newPassword);
  await page.getByRole("button", { name: "Đổi mật khẩu" }).click();
  await expect(page).toHaveURL(new RegExp(`${ADMIN_ROUTES.home}$`));
  await expect(page.getByRole("navigation", { name: "Menu chính" })).toBeVisible();
});

test("a new timeline event shows on the public home page", async () => {
  await page.goto(ADMIN_ROUTES.timeline);
  await page.getByRole("button", { name: "Thêm mốc" }).click();
  const form = dialog("Thêm mốc");
  await form.getByLabel("Năm").fill("2031");
  await titleVi(form).fill(EVENT_TITLE);
  await form.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(form).toBeHidden();
  await expect(eventRow(EVENT_TITLE)).toBeVisible();

  await expectPublicText(page, "/vi", EVENT_TITLE);
  await page.goto("/vi");
  await expect(page.getByText(EVENT_TITLE).first()).toBeVisible({ timeout: PUBLIC_WAIT_MS });
});

test("a draft story is hidden until it is published", async () => {
  await page.goto(`${ADMIN_ROUTES.stories}/moi`);
  await page.getByLabel("Tiêu đề").first().fill(STORY_TITLE);
  const slug = await page.getByLabel("Đường dẫn").first().inputValue();
  expect(slug).not.toBe("");
  await page.locator(".ProseMirror").first().click();
  await page.keyboard.type("Nội dung thử của bài viết.");
  await page.getByRole("button", { name: "Lưu", exact: true }).click();

  // After the create, the page goes to the edit page of the new story, where the story can be published.
  const publish = page.getByRole("button", { name: "Đăng bài" });
  await expect(publish).toBeVisible();
  expect((await page.request.get(`/vi/cau-chuyen/${slug}`)).status()).toBe(404);

  await expect(publish).toBeEnabled();
  await publish.click();
  await expect(page.getByRole("button", { name: "Gỡ bài" })).toBeVisible();

  await expect
    .poll(async () => (await page.request.get(`/vi/cau-chuyen/${slug}`)).status(), {
      timeout: PUBLIC_WAIT_MS,
      intervals: [250, 500, 1000],
    })
    .toBe(200);
  await page.goto(`/vi/cau-chuyen/${slug}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(STORY_TITLE);
});

test("an uploaded photo appears in the media grid", async ({}, testInfo) => {
  const jpegPath = testInfo.outputPath("tiny.jpg");
  writeFileSync(jpegPath, makeTinyJpeg());

  await page.goto(ADMIN_ROUTES.media);
  await page.getByRole("button", { name: "Tải ảnh mới" }).click();
  const form = dialog("Tải ảnh mới");
  await form.getByLabel("Chọn ảnh").setInputFiles(jpegPath);
  const alt = form.getByRole("group", { name: /^Mô tả ảnh/ });
  await alt.getByLabel("Tiếng Việt").fill(ALT_VI);
  await alt.getByLabel("English").fill(ALT_EN);
  await form.getByRole("button", { name: "Tải lên" }).click();
  await expect(form).toBeHidden();
  // The file is on the list. (Production serves /media through Caddy, so the thumbnail itself may not load here.)
  await expect(page.locator(`img[alt="${ALT_VI}"]`)).toBeAttached();
});

test("restoring the earlier copy of an edit brings the old title back", async () => {
  await openTimelineEvent(EVENT_TITLE);
  const form = dialog("Sửa mốc");
  await titleVi(form).fill(EDITED_TITLE);
  await form.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(form).toBeHidden();
  await expectPublicText(page, "/vi", EDITED_TITLE);

  await page.goto(ADMIN_ROUTES.history);
  await page.getByLabel("Loại nội dung").selectOption("timeline_event");
  // The newest line is the edit made just now.
  await page.getByRole("button", { name: new RegExp(run) }).first().click();
  await page.getByRole("button", { name: "Khôi phục bản trước" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Khôi phục" }).click();
  await expect(page.getByText("Đã khôi phục.")).toBeVisible();

  await expectPublicText(page, "/vi", EDITED_TITLE, false);
  await expectPublicText(page, "/vi", EVENT_TITLE);
});

test("an expired session opens the sign-in dialog over the edit dialog and the save then completes", async () => {
  await openTimelineEvent(EVENT_TITLE);
  const form = dialog("Sửa mốc");
  await titleVi(form).fill(EDITED_TITLE);

  // The session ends: the browser no longer has the session cookie, so the API answers 401 "session-expired".
  await context.clearCookies({ name: "NEPNHA_SESSION" });
  await form.getByRole("button", { name: "Lưu", exact: true }).click();

  const reLogin = dialog("Phiên đăng nhập đã hết hạn");
  await expect(reLogin).toBeVisible();
  // The edit dialog, with the unsaved text, stays behind it.
  await expect(form).toBeVisible();
  await expect(titleVi(form)).toHaveValue(EDITED_TITLE);

  await reLogin.getByLabel("Mật khẩu").fill(env("E2E_ADMIN_NEW_PASSWORD"));
  await reLogin.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(reLogin).toBeHidden();
  await expect(form).toBeHidden();
  await expect(eventRow(EDITED_TITLE)).toBeVisible();
  await expectPublicText(page, "/vi", EDITED_TITLE);
});

test("the browser back button asks before it leaves a form with unsaved changes", async () => {
  const settingsUrl = new RegExp(`${ADMIN_ROUTES.settings}$`);
  const homeUrl = new RegExp(`${ADMIN_ROUTES.home}$`);
  const question = page.getByRole("alertdialog", { name: "Bạn có thay đổi chưa lưu. Rời trang?" });
  await page.goto(ADMIN_ROUTES.home);
  await page.getByRole("link", { name: "Liên hệ & cài đặt" }).click();
  await expect(page).toHaveURL(settingsUrl);
  const phone = page.getByLabel("Điện thoại");
  await phone.fill("0912 345 678");

  await page.goBack();
  await expect(question).toBeVisible();
  await expect(page).toHaveURL(settingsUrl);
  await question.getByRole("button", { name: "Ở lại" }).click();
  await expect(phone).toHaveValue("0912 345 678");

  await page.goBack();
  await question.getByRole("button", { name: "Rời trang" }).click();
  await expect(page).toHaveURL(homeUrl);

  // A form that is clean again has removed its extra history entry, so one press of back leaves at once.
  await page.getByRole("link", { name: "Liên hệ & cài đặt" }).click();
  await page.getByLabel("Điện thoại").fill("0912 345 678");
  await page.getByRole("button", { name: "Hủy", exact: true }).click();
  await page.goBack();
  await expect(page).toHaveURL(homeUrl);
  await expect(question).toBeHidden();
});

test("a press item with a 200-character link and a long contact address are saved", async () => {
  expect(LONG_URL).toHaveLength(200);
  await page.goto(ADMIN_ROUTES.press);
  await page.getByRole("button", { name: "Thêm bài báo" }).click();
  const form = dialog("Thêm bài báo");
  // fill() does not paste, so the page preview (an outside request) does not run.
  await form.getByLabel("Đường dẫn bài báo").fill(LONG_URL);
  await form.getByLabel(/^Tên báo/).fill("[E2E] Báo thử");
  await titleVi(form).fill(PRESS_TITLE);
  await form.getByRole("button", { name: "Lưu", exact: true }).click();
  await expect(form).toBeHidden();
  // Anchored: the move buttons of the row ("Đưa bài … lên") also contain the title.
  await expect(page.getByRole("button", { name: new RegExp(`^${escapeRegExp(PRESS_TITLE)}`) })).toBeVisible();

  await page.goto(ADMIN_ROUTES.settings);
  await page.getByRole("group", { name: /^Địa chỉ/ }).getByLabel("Tiếng Việt").fill(LONG_ADDRESS);
  const save = page.getByRole("button", { name: "Lưu", exact: true });
  await save.click();
  // Lưu turns off again once the API has stored the address.
  await expect(save).toBeDisabled();
});

test("the session is saved for the mobile and accessibility checks", async () => {
  await context.storageState({ path: env("E2E_STATE_FILE") });
});

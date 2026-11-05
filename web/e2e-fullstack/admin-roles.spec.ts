import { createHmac } from "node:crypto";
import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";
import { ADMIN_ROUTES } from "../src/lib/admin/routes";
import { env } from "./helpers";

// Roles "Chủ" and "Người nhà", and the way back in after a lost phone (decision 0010, items 3 and 4).
// The owner is the admin of admin-flow.spec.ts (its saved session). The member uses a phone.
test.describe.configure({ mode: "serial" });

const run = String(Math.floor(Math.random() * 1_000_000));
const MEMBER_NAME = `[E2E] Người nhà ${run}`;
const MEMBER_EMAIL = `nguoi-nha-${run}@example.com`;
const MEMBER_TEMP_PASSWORD = `tam-thoi-${run}-mat-khau`;
const MEMBER_PASSWORD = `moi-${run}-mat-khau-dai`;
const MEMBER_THIRD_PASSWORD = `ba-${run}-mat-khau-dai`;

let ownerContext: BrowserContext;
let memberContext: BrowserContext;
let owner: Page;
let member: Page;

test.beforeAll(async ({ browser }) => {
  ownerContext = await browser.newContext({ storageState: env("E2E_STATE_FILE") });
  owner = await ownerContext.newPage();
  // A phone: a finger is the main pointer, so the 2FA card offers "Mở ứng dụng xác thực".
  memberContext = await browser.newContext({ ...devices["Pixel 7"] });
  member = await memberContext.newPage();
});

test.afterAll(async () => {
  await ownerContext.close();
  await memberContext.close();
});

/** RFC 6238 code (SHA-1, 6 digits, 30 seconds) of a base32 secret, as an authenticator app computes it. */
function totp(secret: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of secret.replace(/=+$/, "")) bits += alphabet.indexOf(char).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((byte) => parseInt(byte, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(Date.now() / 1000 / 30)));
  const hmac = createHmac("sha1", key).update(counter).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const value = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1_000_000;
  return String(value).padStart(6, "0");
}

async function signInAs(page: Page, email: string, password: string) {
  await page.goto(ADMIN_ROUTES.login);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

/** Starts the setup in the 2FA card, reads the secret from the screen and confirms with a fresh code. */
async function switchOnTwoFactor(page: Page) {
  await page.getByRole("button", { name: "Bật xác thực 2 lớp" }).click();
  await expect(page.getByRole("link", { name: "Mở ứng dụng xác thực" })).toHaveAttribute("href", /^otpauth:\/\/totp\//);
  const secret = (await page.getByText(/^[A-Z2-7]{32}$/).textContent())!.trim();
  await page.getByLabel("Mã 6 số").fill(totp(secret));
  await page.getByRole("button", { name: "Xác nhận và bật" }).click();
}

const memberRow = () => owner.getByRole("listitem", { name: MEMBER_NAME });

test("the owner adds a family member, who signs in on a phone and sets a password", async () => {
  await owner.goto(ADMIN_ROUTES.accounts);
  await owner.getByRole("button", { name: "Thêm người nhà" }).click();
  const form = owner.getByRole("dialog", { name: "Thêm người nhà" });
  await form.getByLabel(/^Email/).fill(MEMBER_EMAIL);
  await form.getByLabel(/^Tên hiển thị/).fill(MEMBER_NAME);
  await form.getByLabel(/^Mật khẩu tạm thời/).fill(MEMBER_TEMP_PASSWORD);
  await form.getByRole("button", { name: "Tạo tài khoản" }).click();
  await form.getByRole("button", { name: "Xong" }).click();
  await expect(memberRow().getByText("Người nhà", { exact: true })).toBeVisible();

  await signInAs(member, MEMBER_EMAIL, MEMBER_TEMP_PASSWORD);
  await expect(member).toHaveURL(new RegExp(`${ADMIN_ROUTES.changePassword}$`));
  await member.getByLabel("Mật khẩu hiện tại").fill(MEMBER_TEMP_PASSWORD);
  await member.getByLabel(/^Mật khẩu mới/).fill(MEMBER_PASSWORD);
  await member.getByLabel("Nhập lại mật khẩu mới").fill(MEMBER_PASSWORD);
  await member.getByRole("button", { name: "Đổi mật khẩu" }).click();
  await expect(member).toHaveURL(new RegExp(`${ADMIN_ROUTES.home}$`));
});

test("a family member sees no account management, and the API refuses it with 403", async () => {
  await member.getByRole("button", { name: "Thêm" }).click();
  const sheet = member.getByRole("dialog", { name: "Thêm" });
  await expect(sheet.getByRole("link", { name: "Bảo mật" })).toBeVisible();
  await expect(sheet.getByRole("link", { name: "Tài khoản" })).toHaveCount(0);
  await sheet.getByRole("link", { name: "Bảo mật" }).click();

  await expect(member).toHaveURL(new RegExp(`${ADMIN_ROUTES.accounts}$`));
  await expect(member.getByRole("heading", { name: "Xác thực 2 lớp" })).toBeVisible();
  await expect(member.getByRole("button", { name: "Thêm người nhà" })).toHaveCount(0);
  await expect(member.getByRole("region", { name: "Danh sách tài khoản" })).toHaveCount(0);

  // The screen only hides it; the API is what refuses it.
  const list = await member.request.get("/api/admin/users");
  expect(list.status()).toBe(403);
  expect((await list.json()).code).toBe("owner-required");
  const csrf = await (await member.request.get("/api/auth/csrf")).json();
  const lock = await member.request.post("/api/admin/users/1/disable", { headers: { [csrf.headerName]: csrf.token } });
  expect(lock.status()).toBe(403);
  expect((await lock.json()).code).toBe("owner-required");

  // The history has no account lines for a member: the owner created this account, and that line is hidden.
  const accountLines = await member.request.get("/api/admin/audit?entityType=app_user");
  expect(accountLines.status()).toBe(200);
  expect(await accountLines.json()).toEqual([]);
  await member.goto(ADMIN_ROUTES.history);
  await expect(member.getByLabel("Loại nội dung").locator("option", { hasText: "Tài khoản" })).toHaveCount(0);
});

test("after a lost phone the owner switches off the member's 2FA, and the member must set it up again", async () => {
  await member.goto(ADMIN_ROUTES.accounts);
  await switchOnTwoFactor(member);
  await expect(member.getByText("Đang bật")).toBeVisible();

  await owner.reload();
  await memberRow().getByRole("button", { name: `Tắt xác thực 2 lớp của ${MEMBER_NAME}` }).click();
  // Both happen in one step: 2FA off and a new temporary password, shown once to the owner.
  const lostPhone = owner.getByRole("dialog", { name: "Tắt xác thực 2 lớp" });
  await lostPhone.getByRole("button", { name: "Tắt 2 lớp và đặt mật khẩu tạm" }).click();
  const temporary = (await lostPhone.getByText(/^[A-Za-z2-9]{16}$/).textContent())!.trim();
  await lostPhone.getByRole("button", { name: "Xong" }).click();
  await expect(memberRow().getByText("Cần bật lại 2 lớp")).toBeVisible();

  // The session on the lost phone has ended.
  await member.goto(ADMIN_ROUTES.media);
  await expect(member).toHaveURL(new RegExp(`${ADMIN_ROUTES.login}`));

  // The saved password no longer works: a thief with the phone cannot get in.
  await signInAs(member, MEMBER_EMAIL, MEMBER_PASSWORD);
  await expect(member.getByText("Email hoặc mật khẩu không đúng.")).toBeVisible();

  // With the temporary password: first a new password, then only the 2FA setup is open.
  await signInAs(member, MEMBER_EMAIL, temporary);
  await expect(member).toHaveURL(new RegExp(`${ADMIN_ROUTES.changePassword}$`));
  await member.getByLabel("Mật khẩu hiện tại").fill(temporary);
  await member.getByLabel(/^Mật khẩu mới/).fill(MEMBER_THIRD_PASSWORD);
  await member.getByLabel("Nhập lại mật khẩu mới").fill(MEMBER_THIRD_PASSWORD);
  await member.getByRole("button", { name: "Đổi mật khẩu" }).click();
  await expect(member).toHaveURL(new RegExp(`${ADMIN_ROUTES.setupTotp}$`));
  await expect(member.getByRole("heading", { level: 1, name: "Bật lại xác thực 2 lớp" })).toBeVisible();
  await member.goto(ADMIN_ROUTES.media);
  await expect(member).toHaveURL(new RegExp(`${ADMIN_ROUTES.setupTotp}$`));

  await switchOnTwoFactor(member);
  await expect(member).toHaveURL(new RegExp(`${ADMIN_ROUTES.home}$`));
  await expect(member.getByRole("navigation", { name: "Menu chính" })).toBeVisible();

  // From now on only an owner can switch it off.
  await member.goto(ADMIN_ROUTES.accounts);
  await expect(member.getByText("Đang bật")).toBeVisible();
  await expect(member.getByRole("button", { name: "Tắt xác thực 2 lớp" })).toHaveCount(0);
  await expect(member.getByText("Chỉ Chủ tắt được xác thực 2 lớp của bạn.")).toBeVisible();

  // The owner's action is in the history.
  await owner.goto(ADMIN_ROUTES.history);
  await expect(owner.getByText(MEMBER_NAME).first()).toBeVisible();
});

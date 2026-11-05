import { expect, type Page } from "@playwright/test";

/** Revalidation runs after the API commit, so a public page may need a moment to change. */
export const PUBLIC_WAIT_MS = 10_000;

export function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. Run the tests with \`npm run test:fullstack\`.`);
  return value;
}

/** Fetches a public page again and again until its HTML does (or does not) contain `text`. */
export async function expectPublicText(page: Page, url: string, text: string, present = true): Promise<void> {
  await expect
    .poll(
      async () => {
        const response = await page.request.get(url);
        return response.ok() && (await response.text()).includes(text);
      },
      { timeout: PUBLIC_WAIT_MS, intervals: [250, 500, 1000], message: `${url} should ${present ? "" : "not "}contain "${text}"` },
    )
    .toBe(present);
}

export async function signIn(page: Page, password: string): Promise<void> {
  await page.getByLabel("Email").fill(env("E2E_ADMIN_EMAIL"));
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
}

import { defineConfig, devices } from "@playwright/test";

// run.mjs starts the database, the API and the web server, and passes their addresses and the
// generated passwords as environment variables. Nothing here is a secret or a fixed port.
const baseURL = process.env.E2E_WEB_ORIGIN;
if (!baseURL) throw new Error("E2E_WEB_ORIGIN is not set. Run the tests with `npm run test:fullstack`.");

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: ".",
  testMatch: /.*\.spec\.ts/,
  // The flow changes shared data and the password, so everything runs one test at a time.
  fullyParallel: false,
  workers: 1,
  forbidOnly: isCi,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  // The html report goes to web/playwright-report on every machine: CI uploads it, `npx playwright show-report` opens it.
  reporter: [["list"], ["html", { open: "never", outputFolder: "../playwright-report" }]],
  outputDir: "../test-results",
  use: { baseURL, trace: "retain-on-failure", locale: "vi-VN" },
  projects: [
    // Signs in for the first time, changes the password and saves the session for the other project.
    { name: "flow", testMatch: /admin-flow\.spec\.ts/, use: { ...devices["Desktop Chrome"] } },
    {
      name: "checks",
      testMatch: /admin-(mobile|a11y)\.spec\.ts/,
      dependencies: ["flow"],
      use: { ...devices["Desktop Chrome"], storageState: process.env.E2E_STATE_FILE },
    },
    // The owner (the saved session) and a family member on a phone: roles and the 2FA reset.
    { name: "roles", testMatch: /admin-roles\.spec\.ts/, dependencies: ["flow"], use: { ...devices["Desktop Chrome"] } },
  ],
});

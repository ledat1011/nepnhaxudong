import { defineConfig, devices } from "@playwright/test";
import {
  FAKE_API_PORT,
  HOST,
  origin,
  REVALIDATE_SECRET,
  TARGETS,
} from "./e2e/targets.mjs";

const isCi = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isCi,
  workers: isCi ? 2 : undefined,
  reporter: isCi ? [["list"], ["html", { open: "never" }]] : "list",
  use: { trace: "retain-on-failure" },
  projects: [
    {
      name: "mock",
      testIgnore: /(revalidate|broken-image)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: origin(TARGETS.mock.port) },
    },
    {
      name: "api",
      // Specs that need content from the fake API (the mock fixtures have no images).
      testMatch: /(revalidate|broken-image)\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: origin(TARGETS.api.port) },
    },
  ],
  // The apps are built first by `e2e/build.mjs` (see `npm run test:e2e`).
  // `next start` does not work with `output: "standalone"`, so the standalone servers run.
  webServer: [
    {
      command: "node e2e/fake-api.mjs",
      url: `${origin(FAKE_API_PORT)}/api/public/vi/home`,
      env: { PORT: String(FAKE_API_PORT) },
      reuseExistingServer: false,
    },
    {
      command: `node ${TARGETS.mock.distDir}/standalone/server.js`,
      url: `${origin(TARGETS.mock.port)}/robots.txt`,
      env: {
        PORT: String(TARGETS.mock.port),
        HOSTNAME: HOST,
        CONTENT_SOURCE: "mock",
        SITE_URL: origin(TARGETS.mock.port),
      },
      reuseExistingServer: false,
    },
    {
      command: `node ${TARGETS.api.distDir}/standalone/server.js`,
      url: `${origin(TARGETS.api.port)}/robots.txt`,
      env: {
        PORT: String(TARGETS.api.port),
        HOSTNAME: HOST,
        CONTENT_SOURCE: "api",
        API_BASE_URL: origin(FAKE_API_PORT),
        REVALIDATE_SECRET,
        SITE_URL: origin(TARGETS.api.port),
      },
      reuseExistingServer: false,
    },
  ],
});

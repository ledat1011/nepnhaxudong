// Ports and build directories shared by the e2e build script and the Playwright config.
// Every server listens on, and every URL uses, 127.0.0.1: on Linux `localhost` can resolve to ::1.
export const HOST = "127.0.0.1";

export const origin = (port) => `http://${HOST}:${port}`;

export const FAKE_API_PORT = 4010;

export const TARGETS = {
  mock: { port: 3100, distDir: ".next-e2e-mock" },
  api: { port: 3200, distDir: ".next-e2e-api" },
};

export const REVALIDATE_SECRET = "e2e-secret";

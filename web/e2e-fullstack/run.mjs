// Full-stack admin e2e: a real Postgres (Docker), the real API jar, the real web build, then Playwright.
// Everything it starts is stopped and removed in `finally`. Ports are free ports chosen at run time.
// Needs: Docker, JDK 21 (JAVA_HOME), Node 22. Works on Windows and Linux.
import { spawn, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { createServer } from "node:net";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HOST = "127.0.0.1";
const isWindows = process.platform === "win32";
const webDir = fileURLToPath(new URL("..", import.meta.url));
const apiDir = path.resolve(webDir, "..", "api");
const distDirName = ".next-e2e-fullstack";
const distDir = path.join(webDir, distDirName);
const startedAt = Date.now();

const children = [];
let container = null;
let tempDir = null;

const log = (message) => console.log(`[fullstack] ${message}`);
const secret = () => randomBytes(18).toString("base64url");

function freePort() {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, HOST, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { stdio: "inherit", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} exited with ${result.status}`); // no arguments: they may hold a secret
}

function start(name, command, args, options) {
  const child = spawn(command, args, { stdio: ["ignore", "inherit", "inherit"], ...options });
  child.on("error", (error) => console.error(`[fullstack] ${name} failed to start: ${error.message}`));
  children.push({ name, child });
  return child;
}

async function waitFor(name, check, timeoutMs, owner) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    if (owner && owner.exitCode !== null) throw new Error(`${name} stopped (exit code ${owner.exitCode}) before it was ready`);
    try {
      if (await check()) return;
    } catch {
      // not ready yet
    }
    if (Date.now() > deadline) throw new Error(`${name} was not ready after ${timeoutMs / 1000} s`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

const httpOk = (url) => async () => (await fetch(url)).ok;

async function stopChild({ name, child }) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise((resolve) => child.once("exit", resolve));
  if (isWindows) spawnSync("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
  else child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 10_000);
  await exited;
  clearTimeout(timer);
  log(`${name} stopped`);
}

async function cleanup() {
  for (const entry of children.splice(0).reverse()) await stopChild(entry);
  if (container) {
    spawnSync("docker", ["rm", "-f", container], { stdio: "ignore" });
    log(`container ${container} removed`);
    container = null;
  }
  rmSync(distDir, { recursive: true, force: true });
  if (tempDir) rmSync(tempDir, { recursive: true, force: true });
  tempDir = null;
}

async function main() {
  tempDir = mkdtempSync(path.join(tmpdir(), "nepnha-e2e-"));
  const mediaDir = path.join(tempDir, "media");
  const dbPort = await freePort();
  const apiPort = await freePort();
  const webPort = await freePort();
  const apiOrigin = `http://${HOST}:${apiPort}`;
  const webOrigin = `http://${HOST}:${webPort}`;
  const dbPassword = secret();
  const revalidateSecret = secret();
  const adminTempPassword = secret();
  const adminNewPassword = secret();
  // All values are throwaway and exist for this run only, so a leaked trace holds nothing of value. Still, on GitHub
  // Actions they are masked in the log.
  if (process.env.GITHUB_ACTIONS) {
    for (const value of [dbPassword, revalidateSecret, adminTempPassword, adminNewPassword]) console.log(`::add-mask::${value}`);
  }

  // 1. Throwaway Postgres.
  container = `nepnha-e2e-${randomBytes(4).toString("hex")}`;
  log(`starting Postgres ${container} on port ${dbPort}`);
  run(
    "docker",
    [
      "run", "--rm", "-d", "--name", container,
      "-p", `${HOST}:${dbPort}:5432`,
      "-e", "POSTGRES_DB=nepnha_e2e", "-e", "POSTGRES_USER=nepnha", "-e", "POSTGRES_PASSWORD",
      "postgres:16-alpine",
    ],
    { stdio: ["ignore", "ignore", "inherit"], env: { ...process.env, POSTGRES_PASSWORD: dbPassword } },
  );
  // The first server of the image listens on its socket only. A TCP connection works only on the final server.
  await waitFor(
    "Postgres",
    () =>
      spawnSync(
        "docker",
        ["exec", "-e", "PGPASSWORD", container, "psql", "-h", "127.0.0.1", "-U", "nepnha", "-d", "nepnha_e2e", "-c", "select 1"],
        { stdio: "ignore", env: { ...process.env, PGPASSWORD: dbPassword } },
      ).status === 0,
    90_000,
  );

  // 2. API jar.
  log("building the API");
  if (isWindows) run(process.env.ComSpec ?? "cmd.exe", ["/d", "/c", path.join(apiDir, "mvnw.cmd"), "-B", "-q", "-DskipTests", "package"], { cwd: apiDir });
  else run("./mvnw", ["-B", "-q", "-DskipTests", "package"], { cwd: apiDir });
  const jar = readdirSync(path.join(apiDir, "target")).find((file) => /^nepnha-api-.*\.jar$/.test(file));
  if (!jar) throw new Error("The API jar was not built");

  // 3. API. Default profile (not "dev"); the session cookie is not Secure because the test uses plain HTTP.
  log(`starting the API on port ${apiPort}`);
  const api = start("API", "java", ["-jar", path.join(apiDir, "target", jar)], {
    cwd: tempDir,
    env: {
      ...process.env,
      // A profile from the developer's shell must not change the API (the test needs the default profile).
      SPRING_PROFILES_ACTIVE: "",
      SERVER_PORT: String(apiPort),
      DB_URL: `jdbc:postgresql://${HOST}:${dbPort}/nepnha_e2e`,
      DB_USER: "nepnha",
      DB_PASSWORD: dbPassword,
      BOOTSTRAP_ADMIN_EMAIL: "admin@example.com",
      BOOTSTRAP_ADMIN_PASSWORD: adminTempPassword,
      MEDIA_DIR: mediaDir,
      WEB_BASE_URL: webOrigin,
      REVALIDATE_SECRET: revalidateSecret,
      SERVER_SERVLET_SESSION_COOKIE_SECURE: "false",
    },
  });
  await waitFor("API", httpOk(`${apiOrigin}/api/actuator/health`), 120_000, api);

  // 4. Web: its own dist directory, so the dev server's `.next` is never touched.
  rmSync(distDir, { recursive: true, force: true });
  const webEnv = {
    ...process.env,
    NEXT_DIST_DIR: distDirName,
    CONTENT_SOURCE: "api",
    API_BASE_URL: apiOrigin,
    API_PROXY_ORIGIN: apiOrigin,
    SITE_URL: webOrigin,
    REVALIDATE_SECRET: revalidateSecret,
  };
  log("building the web app");
  const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");
  run(process.execPath, [nextBin, "build"], { cwd: webDir, env: webEnv });
  const server = path.join(distDir, "standalone", "server.js");
  if (!existsSync(server)) throw new Error(`${server} is missing. Next probably inferred a tracing root above web/.`);
  // The standalone server serves static files only when they sit next to it.
  cpSync(path.join(distDir, "static"), path.join(distDir, "standalone", distDirName, "static"), { recursive: true });
  if (existsSync(path.join(webDir, "public"))) cpSync(path.join(webDir, "public"), path.join(distDir, "standalone", "public"), { recursive: true });
  log(`starting the web app on port ${webPort}`);
  const web = start("web", process.execPath, [server], {
    cwd: webDir,
    env: { ...webEnv, PORT: String(webPort), HOSTNAME: HOST },
  });
  await waitFor("web", httpOk(`${webOrigin}/robots.txt`), 60_000, web);

  // 5. Playwright. The passwords reach the tests only through the environment.
  log("running Playwright");
  const playwrightCli = createRequire(import.meta.url).resolve("@playwright/test/cli");
  const result = spawnSync(
    process.execPath,
    [playwrightCli, "test", "--config", path.join("e2e-fullstack", "playwright.fullstack.config.ts"), ...process.argv.slice(2)],
    {
      cwd: webDir,
      stdio: "inherit",
      env: {
        ...process.env,
        E2E_WEB_ORIGIN: webOrigin,
        E2E_ADMIN_EMAIL: "admin@example.com",
        E2E_ADMIN_TEMP_PASSWORD: adminTempPassword,
        E2E_ADMIN_NEW_PASSWORD: adminNewPassword,
        E2E_STATE_FILE: path.join(tempDir, "admin-state.json"),
      },
    },
  );
  return result.status ?? 1;
}

// SIGINT and `finally` must not both run the cleanup.
let cleanupPromise = null;
const cleanupOnce = () => (cleanupPromise ??= cleanup());

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    cleanupOnce().finally(() => process.exit(130));
  });
}

let exitCode = 1;
try {
  exitCode = await main();
} catch (error) {
  console.error(`[fullstack] ${error instanceof Error ? error.message : error}`);
} finally {
  await cleanupOnce();
  log(`done in ${Math.round((Date.now() - startedAt) / 1000)} s, exit code ${exitCode}`);
}
process.exit(exitCode);

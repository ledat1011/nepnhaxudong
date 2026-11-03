// Builds the app once per e2e web server. Each build has its own dist directory,
// so the page caches of the two servers never mix, and its own SITE_URL.
// The app has no `public` folder, so there is nothing else to copy.
import { spawnSync } from "node:child_process";
import { cpSync, existsSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { origin, TARGETS } from "./targets.mjs";

const webDir = fileURLToPath(new URL("..", import.meta.url));
const nextBin = createRequire(import.meta.url).resolve("next/dist/bin/next");

for (const [name, { port, distDir }] of Object.entries(TARGETS)) {
  // A clean directory: a cache left by an earlier run must not reach this run.
  rmSync(`${webDir}/${distDir}`, { recursive: true, force: true });
  console.log(`[e2e build] ${name}: next build -> ${distDir}`);
  const result = spawnSync(process.execPath, [nextBin, "build"], {
    cwd: webDir,
    stdio: "inherit",
    env: {
      ...process.env,
      NEXT_DIST_DIR: distDir,
      SITE_URL: origin(port),
    },
  });
  if (result.status !== 0) process.exit(result.status ?? 1);

  // The tests start `<distDir>/standalone/server.js`. Next puts the server one folder deeper
  // when it infers a tracing root above `web/` (for example from a lockfile there).
  const server = `${webDir}/${distDir}/standalone/server.js`;
  if (!existsSync(server)) {
    console.error(
      `[e2e build] ${name}: ${server} is missing. Next probably inferred a tracing root above web/; ` +
        "look for a standalone/<folder>/server.js and check for a package-lock.json outside web/.",
    );
    process.exit(1);
  }

  // `next start` refuses `output: "standalone"`, so the tests run the standalone
  // server. It serves static files only when they sit next to it.
  cpSync(`${webDir}/${distDir}/static`, `${webDir}/${distDir}/standalone/${distDir}/static`, {
    recursive: true,
  });
}

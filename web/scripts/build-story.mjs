import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { composeScene, SCENE_SLUGS } from "./story-scenes.mjs";

const webDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const storyDir = resolve(webDir, "..", "brand", "story");
const outDir = resolve(webDir, "public", "story");

function readDir(dir) {
  if (!existsSync(dir)) return {};
  return Object.fromEntries(
    readdirSync(dir)
      .filter((file) => file.endsWith(".svg"))
      .map((file) => [file.replace(/\.svg$/, ""), readFileSync(resolve(dir, file), "utf8")]),
  );
}

const people = readDir(resolve(storyDir, "people"));
const parts = readDir(resolve(storyDir, "parts"));

mkdirSync(outDir, { recursive: true });
SCENE_SLUGS.forEach((slug, index) => {
  const sceneSvg = readFileSync(resolve(storyDir, "scenes", `${slug}.svg`), "utf8");
  const svg = composeScene({ slug, sceneSvg, people, parts });
  writeFileSync(resolve(outDir, `canh-${index + 1}-${slug}.svg`), svg);
});

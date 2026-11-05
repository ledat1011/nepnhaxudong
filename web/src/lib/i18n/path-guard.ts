import { isLang } from "./langs";
import { isStorySection } from "./routes";

export type PathDecision = "redirect-root" | "pass" | "not-found";

// Next internals (`_not-found` is the 404 page the proxy rewrites to), the API, the admin area
// (its own root layout, outside the language segment) and the local /media route.
const INTERNAL_PREFIXES = ["_next", "_not-found", "api", "admin", "media"];
// Files the app serves itself.
const OWN_FILES = new Set(["robots.txt", "sitemap.xml", "icon.svg"]);
// Folder of the story scene pictures in `public/`: one level of `.svg` (layered scenes kept for
// motion) and `.webp` (the sketches the page shows now, decision 0014) files.
const STORY_ASSET_DIR = "story";
const STORY_ASSET_TYPES = [".svg", ".webp"];
// Folder of the generated image routes, under a language and under its story section.
const IMAGE_ROUTE = "opengraph-image";

/**
 * Decides from the path alone what a request needs: the language redirect, the 404 page,
 * or a normal render. A path that no page can serve is answered before any rendering, so the
 * 404 page comes with a real HTML body and is not cached as a rendered page.
 */
export function classifyPath(pathname: string): PathDecision {
  const [first, second, third] = pathname.split("/").filter(Boolean);
  if (first === undefined) return "redirect-root";

  if (isLang(first)) {
    if (second === undefined || second === IMAGE_ROUTE) return "pass";
    return isStorySection(first, second) ? "pass" : "not-found";
  }

  if (INTERNAL_PREFIXES.includes(first)) return "pass";
  if (first === STORY_ASSET_DIR) {
    const isAsset = STORY_ASSET_TYPES.some((type) => second?.endsWith(type));
    return isAsset && third === undefined ? "pass" : "not-found";
  }
  return OWN_FILES.has(first) && second === undefined ? "pass" : "not-found";
}

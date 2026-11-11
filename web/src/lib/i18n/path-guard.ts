import { isLang } from "./langs";
import { isStorySection } from "./routes";

export type PathDecision = "redirect-root" | "pass" | "not-found";

// Next internals (`_not-found` is the 404 page the proxy rewrites to), the API, the admin area
// (its own root layout, outside the language segment) and the local /media route.
const INTERNAL_PREFIXES = ["_next", "_not-found", "api", "admin", "media"];
// Files the app serves itself.
const OWN_FILES = new Set(["robots.txt", "sitemap.xml", "icon.svg"]);
// Folders of pictures in `public/`, one level deep, with the file types each may hold: the story
// sketches (decision 0014) and the moving layers cut from them (`lop`, decision 0017), the
// picture behind the hero (decision 0016), and the journey and press photos of the sample content.
const ASSET_DIRS: Record<string, readonly string[]> = {
  story: [".webp"],
  lop: [".webp"],
  hero: [".webp"],
  journey: [".webp"],
  press: [".webp"],
};
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
  const assetTypes = Object.hasOwn(ASSET_DIRS, first) ? ASSET_DIRS[first] : undefined;
  if (assetTypes !== undefined) {
    const isAsset = assetTypes.some((type) => second?.endsWith(type));
    return isAsset && third === undefined ? "pass" : "not-found";
  }
  return OWN_FILES.has(first) && second === undefined ? "pass" : "not-found";
}

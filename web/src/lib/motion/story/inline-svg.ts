const SVG_NS = "http://www.w3.org/2000/svg";
/**
 * Elements that can run code, load files or change the drawing by themselves: a style sheet
 * reaches the whole page, and the SMIL elements can rewrite any attribute (for example an
 * `href`) after this check. The scene files use none of them.
 */
const UNSAFE_ELEMENTS = new Set([
  "script",
  "foreignobject",
  "style",
  "animate",
  "set",
  "animatetransform",
  "animatemotion",
]);
/** A `url(...)` that does not point inside the same file. */
const EXTERNAL_URL = /url\(\s*['"]?\s*(?!#)/i;

/**
 * The browser side of `assertSafe` (web/scripts/svg-safety.mjs), a little stricter: only svg
 * elements, none of UNSAFE_ELEMENTS, no event attribute, and every link points inside the same
 * file. The build script checks the files already; this is the second check, for a file that
 * changed on the server.
 */
function isSafe(root: Element): boolean {
  for (const el of [root, ...root.querySelectorAll("*")]) {
    if (el.namespaceURI !== SVG_NS) return false;
    const tag = el.localName.toLowerCase();
    if (UNSAFE_ELEMENTS.has(tag)) return false;
    for (const attr of el.attributes) {
      const name = attr.localName.toLowerCase();
      if (name.startsWith("on")) return false;
      if (name === "href" && !attr.value.trim().startsWith("#")) return false;
      if (EXTERNAL_URL.test(attr.value)) return false;
    }
  }
  return true;
}

/**
 * Replaces the <img> with the same file as inline svg, so the motion code can move its groups.
 * The file is the page's own (same origin) and is usually in the cache already. Returns null and
 * keeps the <img> on any failure: a network error, a bad status, broken or unsafe markup, or an
 * <img> that left the page while the file loaded.
 */
export async function inlineSvg(
  img: HTMLImageElement,
  fetcher: typeof fetch = fetch,
): Promise<SVGSVGElement | null> {
  try {
    const src = img.currentSrc || img.src;
    if (new URL(src, window.location.href).origin !== window.location.origin) return null;
    const response = await fetcher(src);
    if (!response.ok) return null;
    const text = await response.text();
    const doc = new DOMParser().parseFromString(text, "image/svg+xml");
    const source = doc.documentElement;
    if (doc.getElementsByTagName("parsererror").length > 0) return null;
    if (source.localName !== "svg" || source.namespaceURI !== SVG_NS) return null;
    if (!isSafe(source)) return null;
    if (!img.isConnected) return null;

    const svg = document.importNode(source, true) as unknown as SVGSVGElement;
    const className = img.getAttribute("class");
    if (className !== null) svg.setAttribute("class", className);
    // The drawing is decoration: the scene's words are in the HTML next to it.
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    img.replaceWith(svg);
    return svg;
  } catch {
    return null;
  }
}

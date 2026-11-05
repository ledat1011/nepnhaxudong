import { SVG_NS, unsafeAttribute, unsafeElement } from "@/lib/svg-safety-rules.mjs";

/**
 * Only svg elements, and none that svg-safety-rules.mjs forbids. The build check
 * (web/scripts/svg-safety.mjs) applies the same rules to the source text; this second check is
 * for a file that changed on the server.
 */
export function isSafe(root: Element): boolean {
  for (const el of [root, ...root.querySelectorAll("*")]) {
    if (el.namespaceURI !== SVG_NS) return false;
    if (unsafeElement(el.localName)) return false;
    for (const attr of el.attributes) {
      if (unsafeAttribute(attr.localName, attr.value)) return false;
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

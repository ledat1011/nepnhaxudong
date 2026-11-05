// Plain ESM with no imports: the build scripts (web/scripts/svg-safety.mjs) run it in Node, and
// the browser check (web/src/lib/motion/story/inline-svg.ts) bundles it.

export const SVG_NS = "http://www.w3.org/2000/svg";

/**
 * Elements that can run code, load files or change the drawing by themselves: a style sheet
 * reaches the whole page, and the SMIL elements can rewrite any attribute (for example an
 * `href`) after the check. Lower case.
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

/** A `url(...)` that does not point inside the same file (all of the lookahead, so no backtracking). */
const EXTERNAL_URL = /url\((?!\s*['"]?\s*#)/i;

/**
 * Why an element with this local name is not allowed, or null.
 * @param {string} localName
 * @returns {string | null}
 */
export function unsafeElement(localName) {
  return UNSAFE_ELEMENTS.has(localName.toLowerCase()) ? `a ${localName} element` : null;
}

/**
 * Why an attribute is not allowed, or null. `value` is the value after character references.
 * Every link must point inside the same file.
 * @param {string} localName
 * @param {string} value
 * @returns {string | null}
 */
export function unsafeAttribute(localName, value) {
  const name = localName.toLowerCase();
  if (name.startsWith("on")) return "an event handler attribute";
  if (name === "href" && !value.trim().startsWith("#")) return "an href that points outside the file";
  if (EXTERNAL_URL.test(value)) return "a url() that points outside the file";
  return null;
}

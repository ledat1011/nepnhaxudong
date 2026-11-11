import { SVG_NS, unsafeAttribute, unsafeElement } from "../src/lib/svg-safety-rules.mjs";

const COMMENT = /<!--[\s\S]*?-->/g;
const START_TAG = /<([A-Za-z_][\w.:-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTRIBUTE = /([^\s=/]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const NAMED_REFERENCES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

function decode(value) {
  return value.replace(/&(?:#x([\da-f]+)|#(\d+)|(amp|lt|gt|quot|apos));/gi, (_, hex, dec, named) =>
    named ? NAMED_REFERENCES[named.toLowerCase()] : String.fromCodePoint(parseInt(hex ?? dec, hex ? 16 : 10)),
  );
}

const localName = (qualified) => qualified.slice(qualified.indexOf(":") + 1);

/** Why the markup fails the rules of svg-safety-rules.mjs, or null. */
function findUnsafe(svg) {
  const markup = svg.replace(COMMENT, "");
  // An entity declared in a doctype could hide markup from this check.
  if (/<!DOCTYPE/i.test(markup)) return "a doctype";
  for (const [, name, rest] of markup.matchAll(START_TAG)) {
    if (name.includes(":") && !name.startsWith("svg:")) return "an element outside the svg namespace";
    const element = unsafeElement(localName(name));
    if (element) return element;
    for (const [, attr, double, single] of rest.matchAll(ATTRIBUTE)) {
      const value = decode(double ?? single);
      if (attr === "xmlns" && value !== SVG_NS) return "an element outside the svg namespace";
      const problem = unsafeAttribute(localName(attr), value);
      if (problem) return problem;
    }
    if (/[^\s/]/.test(rest.replace(ATTRIBUTE, ""))) return "an attribute without a quoted value";
  }
  return null;
}

/** Throws when the svg has markup that the rules of svg-safety-rules.mjs reject. */
export function assertSafe(svg, name) {
  const problem = findUnsafe(svg);
  if (problem) throw new Error(`${name} contains ${problem}`);
}

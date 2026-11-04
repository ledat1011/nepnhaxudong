import { assertSafe } from "./svg-safety.mjs";

export const SCENE_SLUGS = [
  "cay-ma",
  "nang-mua-gio",
  "gat",
  "say",
  "xay-xat",
  "dong-goi",
  "den-tay-khach",
  "mam-com",
];
export const SCENE_BUDGET_BYTES = 18 * 1024;
export const STORY_BUDGET_BYTES = 140 * 1024;

function attr(tag, name) {
  const match = tag.match(new RegExp(String.raw`\s${name}="([^"]*)"`));
  return match === null ? null : match[1];
}

function requireAttr(tag, name, what) {
  const value = attr(tag, name);
  if (value === null) throw new Error(`${what} has no ${name}`);
  return value;
}

function splitSvg(svg, name) {
  const open = svg.match(/<svg\b[^>]*>/);
  const close = svg.lastIndexOf("</svg>");
  if (open === null || close === -1) throw new Error(`${name} is not an svg document`);
  return { openTag: open[0], inner: svg.slice(open.index + open[0].length, close) };
}

function personContent(pose, svg) {
  const name = `pose ${pose}`;
  const { openTag, inner } = splitSvg(svg, name);
  if (attr(openTag, "viewBox") !== "0 0 256 256") throw new Error(`${name} must have viewBox="0 0 256 256"`);
  const count = (inner.match(/\sdata-part="person"/g) ?? []).length;
  if (count !== 1) throw new Error(`${name} must have exactly one data-part="person" group, found ${count}`);
  return inner;
}

function number(value, what) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`${what} is not a number: ${value}`);
  return n;
}

function placePeople(body, people) {
  return body.replace(/<use\b[^>]*\sdata-person="[^"]*"[^>]*\/>/g, (tag) => {
    const pose = attr(tag, "data-person");
    if (!Object.hasOwn(people, pose)) throw new Error(`pose ${pose} is missing`);
    const slot = attr(tag, "data-slot") ?? pose;
    const x = number(requireAttr(tag, "x", tag), "x");
    const y = number(requireAttr(tag, "y", tag), "y");
    const width = number(requireAttr(tag, "width", tag), "width");
    const scale = Number((width / 256).toFixed(4));
    return `<g data-part="${slot}" transform="translate(${x} ${y}) scale(${scale})">${personContent(pose, people[pose])}</g>`;
  });
}

function includeParts(body, parts) {
  return body.replace(/<use\b[^>]*\sdata-include="[^"]*"[^>]*\/>/g, (tag) => {
    const name = attr(tag, "data-include");
    if (!Object.hasOwn(parts, name)) throw new Error(`part ${name} is missing`);
    const x = number(requireAttr(tag, "x", tag), "x");
    const y = number(requireAttr(tag, "y", tag), "y");
    const { inner } = splitSvg(parts[name], `part ${name}`);
    return `<g data-part="${name}" transform="translate(${x} ${y})">${inner}</g>`;
  });
}

function prefixIds(body, slug) {
  return body
    .replace(/(\sid=")([^"]*")/g, `$1${slug}-$2`)
    .replace(/url\(\s*#([^)\s]+)\s*\)/g, `url(#${slug}-$1)`)
    .replace(/((?:xlink:)?href=")#/g, `$1#${slug}-`);
}

/** Builds the finished scene svg from the scene source, the pose files and the shared parts. */
export function composeScene({ slug, sceneSvg, people, parts }) {
  assertSafe(sceneSvg, `scene ${slug}`);
  const { openTag, inner } = splitSvg(sceneSvg, `scene ${slug}`);
  const viewBox = requireAttr(openTag, "viewBox", `scene ${slug}`);
  if (viewBox !== "0 0 800 600") throw new Error(`scene ${slug} must have viewBox="0 0 800 600"`);

  let body = includeParts(placePeople(inner, people), parts);
  assertSafe(body, `scene ${slug} (composed)`);
  body = prefixIds(body, slug).replace(/>\s+</g, "><").trim();

  const xmlns = attr(openTag, "xmlns") ?? "http://www.w3.org/2000/svg";
  const root =
    `<svg xmlns="${xmlns}" viewBox="${viewBox}" width="800" height="600"` +
    ` data-scene="${slug}" aria-hidden="true" focusable="false">`;
  return `${root}${body}</svg>`;
}

import { describe, expect, it } from "vitest";
import { assertSafe } from "../../scripts/svg-safety.mjs";

const check = assertSafe as (svg: string, name: string) => void;
const svg = (body: string, attrs = "") => `<svg xmlns="http://www.w3.org/2000/svg"${attrs}>${body}</svg>`;

/** Markup the build check rejects. */
const UNSAFE: Array<[string, string]> = [
  ["a script element", svg("<script>alert(1)</script>")],
  ["an onload attribute", svg("<g/>", ' onload="alert(1)"')],
  ["an event attribute deep inside", svg('<g><rect onclick="x()"/></g>')],
  ["a foreignObject", svg('<foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject>')],
  ["an external href", svg('<use href="https://example.com/a.svg#x"/>')],
  [
    "an external xlink:href",
    svg('<image xlink:href="//example.com/a.png"/>', ' xmlns:xlink="http://www.w3.org/1999/xlink"'),
  ],
  ["a relative href", svg('<image href="a.png"/>')],
  ["a data: href", svg('<image href="data:image/png;base64,AAAA"/>')],
  ["an empty href", svg('<a href=""><rect/></a>')],
  ["an external url() paint", svg('<rect fill="url(https://example.com/#g)"/>')],
  ["a relative url() paint", svg('<rect fill="url(other.svg#g)"/>')],
  ["a url() in a style attribute", svg('<rect style="fill: url( \'data:image/png;base64,AAAA\' )"/>')],
  ["a url() written with a character reference", svg('<rect fill="&#117;rl(a.svg#g)"/>')],
  ["a style element", svg("<style>rect{fill:red}</style><rect/>")],
  ["an animate element", svg('<rect><animate attributeName="x" to="9"/></rect>')],
  ["a set element", svg('<a><set attributeName="href" to="javascript:alert(1)"/></a>')],
  ["an animateTransform element", svg('<g><animateTransform attributeName="transform" type="rotate" to="90"/></g>')],
  ["an animateMotion element", svg('<g><animateMotion path="M0 0H9"/></g>')],
  [
    "an element outside the svg namespace",
    svg('<sodipodi:namedview/>', ' xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"'),
  ],
  ["a child that changes the default namespace", svg('<g xmlns="http://www.w3.org/1999/xhtml"/>')],
];

/** Markup the build check accepts. */
const SAFE: Array<[string, string]> = [
  [
    "links inside the file",
    svg('<defs><path id="p" d="M0 0h1"/></defs><use href="#p"/><rect fill="url(#g)" style="fill:url( \'#g\' )"/>'),
  ],
  ["an xlink:href inside the file", svg('<use xlink:href="#p"/>', ' xmlns:xlink="http://www.w3.org/1999/xlink"')],
  ["data attributes and a comment", svg('<!-- <script> --><g data-part="sun" opacity="0.5"/>')],
];

describe("the build check of brand SVG files", () => {
  it.each(UNSAFE)("rejects %s", (_what, markup) => {
    expect(() => check(markup, "test")).toThrow(/^test contains /);
  });

  it.each(SAFE)("accepts %s", (_what, markup) => {
    expect(() => check(markup, "test")).not.toThrow();
  });
});

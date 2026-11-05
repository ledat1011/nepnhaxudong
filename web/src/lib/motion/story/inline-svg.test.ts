import { afterEach, describe, expect, it, vi } from "vitest";
import { inlineSvg } from "./inline-svg";

const GOOD =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" data-scene="say" aria-hidden="true" focusable="false">' +
  '<defs><path id="say-rt" d="M0 0h10"/></defs><use data-part="air" href="#say-rt"/><rect fill="url(#say-g)" width="10" height="10"/></svg>';

const response = (body: string, ok = true) =>
  ({ ok, status: ok ? 200 : 500, text: async () => body }) as unknown as Response;

function setup(body: string | Error, ok = true) {
  document.body.innerHTML =
    '<ul><li><img src="/story/canh-4-say.svg" class="aspect-[4/3] w-full rounded-2xl" alt="" width="800" height="600"></li></ul>';
  const img = document.querySelector("img") as HTMLImageElement;
  const fetcher = vi.fn(async () => {
    if (body instanceof Error) throw body;
    return response(body, ok);
  });
  return { img, fetcher: fetcher as unknown as typeof fetch, calls: fetcher };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("inlineSvg", () => {
  it("replaces the img with the same file as an inline svg", async () => {
    const { img, fetcher, calls } = setup(GOOD);
    const svg = await inlineSvg(img, fetcher);
    expect(calls).toHaveBeenCalledWith(img.src);
    expect(svg).not.toBeNull();
    expect(document.querySelector("img")).toBeNull();
    const placed = document.querySelector("li > svg") as SVGSVGElement;
    expect(placed).toBe(svg);
    expect(placed.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(placed.getAttribute("data-scene")).toBe("say");
    expect(placed.querySelector("[data-part='air']")).not.toBeNull();
  });

  it("copies the class of the img and keeps the svg hidden from screen readers", async () => {
    const { img, fetcher } = setup(GOOD);
    const svg = await inlineSvg(img, fetcher);
    expect(svg?.getAttribute("class")).toBe("aspect-[4/3] w-full rounded-2xl");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
    expect(svg?.getAttribute("focusable")).toBe("false");
  });

  it("keeps the img when fetch throws", async () => {
    const { img, fetcher } = setup(new Error("offline"));
    expect(await inlineSvg(img, fetcher)).toBeNull();
    expect(document.querySelector("img")).toBe(img);
  });

  it("keeps the img when the response is not ok", async () => {
    const { img, fetcher } = setup(GOOD, false);
    expect(await inlineSvg(img, fetcher)).toBeNull();
    expect(document.querySelector("img")).toBe(img);
  });

  it.each([
    ["broken XML", '<svg xmlns="http://www.w3.org/2000/svg"><g></svg>'],
    ["a root that is not svg", '<html xmlns="http://www.w3.org/1999/xhtml"><body/></html>'],
    ["a script element", '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'],
    ["an onload attribute", '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"><g/></svg>'],
    ["an event attribute deep inside", '<svg xmlns="http://www.w3.org/2000/svg"><g><rect onclick="x()"/></g></svg>'],
    [
      "a foreignObject",
      '<svg xmlns="http://www.w3.org/2000/svg"><foreignObject><div xmlns="http://www.w3.org/1999/xhtml">x</div></foreignObject></svg>',
    ],
    ["an external href", '<svg xmlns="http://www.w3.org/2000/svg"><use href="https://example.com/a.svg#x"/></svg>'],
    [
      "an external xlink:href",
      '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><image xlink:href="//example.com/a.png"/></svg>',
    ],
    ["an external url() paint", '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="url(https://example.com/#g)"/></svg>'],
    ["a style element", '<svg xmlns="http://www.w3.org/2000/svg"><style>rect{fill:red}</style><rect/></svg>'],
    ["an animate element", '<svg xmlns="http://www.w3.org/2000/svg"><rect><animate attributeName="x" to="9"/></rect></svg>'],
    ["a set element", '<svg xmlns="http://www.w3.org/2000/svg"><a><set attributeName="href" to="javascript:alert(1)"/></a></svg>'],
    [
      "an animateTransform element",
      '<svg xmlns="http://www.w3.org/2000/svg"><g><animateTransform attributeName="transform" type="rotate" to="90"/></g></svg>',
    ],
    [
      "an animateMotion element",
      '<svg xmlns="http://www.w3.org/2000/svg"><g><animateMotion path="M0 0H9"/></g></svg>',
    ],
  ])("keeps the img when the file has %s", async (_what, body) => {
    const { img, fetcher } = setup(body);
    expect(await inlineSvg(img, fetcher)).toBeNull();
    expect(document.querySelector("img")).toBe(img);
    expect(document.querySelector("svg")).toBeNull();
  });

  it("does not fetch a file from another origin", async () => {
    const { img, fetcher, calls } = setup(GOOD);
    img.src = "https://example.com/story/canh-4-say.svg";
    expect(await inlineSvg(img, fetcher)).toBeNull();
    expect(calls).not.toHaveBeenCalled();
    expect(document.querySelector("img")).toBe(img);
  });

  it("does nothing when the img left the page while the file loaded", async () => {
    const { img, fetcher } = setup(GOOD);
    const pending = inlineSvg(img, fetcher);
    img.remove();
    expect(await pending).toBeNull();
    expect(document.querySelector("svg")).toBeNull();
  });
});

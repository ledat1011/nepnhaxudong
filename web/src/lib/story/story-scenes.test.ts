import { existsSync, readdirSync, readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { ILLUSTRATION_PALETTE } from "../brand/colors";
import {
  composeScene,
  SCENE_BUDGET_BYTES,
  SCENE_SLUGS,
  STORY_BUDGET_BYTES,
} from "../../../scripts/story-scenes.mjs";
import { STORY_SCENES } from "./scenes";

type Compose = (input: {
  slug: string;
  sceneSvg: string;
  people: Record<string, string>;
  parts: Record<string, string>;
}) => string;
const compose = composeScene as Compose;

const PERSON = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs><linearGradient id="skin"><stop offset="0" stop-color="#d9a066"/></linearGradient></defs>
  <g data-part="person"><circle cx="128" cy="60" r="30" fill="url(#skin)"/></g>
</svg>`;
const PART = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect id="box" width="10" height="10"/></svg>`;

function scene(body: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600">\n  ${body}\n</svg>`;
}
const people = { "me-cay": PERSON };
const run = (body: string, p: Record<string, string> = people, parts: Record<string, string> = { machine: PART }) =>
  compose({ slug: "cay-ma", sceneSvg: scene(body), people: p, parts });

describe("composeScene", () => {
  it("places a person at the right position and scale", () => {
    const out = run('<use data-person="me-cay" data-slot="mother" x="100" y="200" width="128" height="128"/>');
    expect(out).toContain('<g data-part="mother" transform="translate(100 200) scale(0.5)">');
    expect(out).toContain('data-part="person"');
    expect(out).not.toContain("data-person");
  });

  it("includes shared parts", () => {
    const out = run('<use data-include="machine" x="10" y="20"/>');
    expect(out).toContain('translate(10 20)');
    expect(out).toContain("<rect");
    expect(out).not.toContain("data-include");
  });

  it("prefixes ids and references with the slug", () => {
    const out = run(
      '<use data-person="me-cay" data-slot="a" x="0" y="0" width="256" height="256"/><use href="#skin"/><path id="p" fill="url(#skin)"/>',
    );
    expect(out).toContain('id="cay-ma-skin"');
    expect(out).toContain('fill="url(#cay-ma-skin)"');
    expect(out).toContain('href="#cay-ma-skin"');
    expect(out).toContain('id="cay-ma-p"');
    expect(out).not.toMatch(/id="skin"/);
  });

  it("sets the root attributes and removes whitespace between tags", () => {
    const out = run("<g/>");
    const root = out.match(/<svg\b[^>]*>/)?.[0] ?? "";
    expect(root).toContain('data-scene="cay-ma"');
    expect(root).toContain('aria-hidden="true"');
    expect(root).toContain('focusable="false"');
    expect(root).toContain('width="800"');
    expect(root).toContain('height="600"');
    expect(out).not.toMatch(/>\s+</);
  });

  it.each([
    "<script>x</script>",
    '<g onload="x"/>',
    '<image href="https://evil.example/a.png"/>',
    "<foreignObject/>",
  ])("rejects unsafe markup %s", (markup) => {
    expect(() => run(markup)).toThrow();
  });

  it("rejects a missing pose, part, or bad pose files", () => {
    expect(() => run('<use data-person="nope" x="0" y="0" width="1" height="1"/>')).toThrow(/nope/);
    expect(() => run('<use data-include="nope" x="0" y="0"/>')).toThrow(/nope/);
    const wrongBox = PERSON.replace("0 0 256 256", "0 0 100 100");
    expect(() => run('<use data-person="me-cay" x="0" y="0" width="1" height="1"/>', { "me-cay": wrongBox })).toThrow(/viewBox/);
    const twoParts = PERSON.replace("</svg>", '<g data-part="person"/></svg>');
    expect(() => run('<use data-person="me-cay" x="0" y="0" width="1" height="1"/>', { "me-cay": twoParts })).toThrow(/person/);
    const noPart = PERSON.replace('data-part="person"', 'data-part="x"');
    expect(() => run('<use data-person="me-cay" x="0" y="0" width="1" height="1"/>', { "me-cay": noPart })).toThrow(/person/);
  });
});

const hasScenes = existsSync("../brand/story/scenes");
const read = (path: string) => readFileSync(path, "utf8");
const readDir = (dir: string): Record<string, string> =>
  Object.fromEntries(
    existsSync(dir)
      ? readdirSync(dir)
          .filter((f) => f.endsWith(".svg"))
          .map((f) => [f.replace(/\.svg$/, ""), read(`${dir}/${f}`)])
      : [],
  );
const gz = (text: string) => gzipSync(text).length;

describe("story scene list", () => {
  it("matches SCENE_SLUGS and the file names", () => {
    expect(STORY_SCENES.map((s) => s.slug)).toEqual(SCENE_SLUGS);
    STORY_SCENES.forEach((s, i) => {
      expect(s.src).toBe(`/story/canh-${i + 1}-${s.slug}.svg`);
      expect([s.width, s.height]).toEqual([800, 600]);
    });
  });
});

describe.skipIf(!hasScenes)("story scene files", () => {
  // Everything is read lazily: the describe body still runs when the suite is skipped.
  const people = () => readDir("../brand/story/people");
  const built = SCENE_SLUGS.map((slug, i) => ({
    slug,
    expected: () =>
      compose({
        slug,
        sceneSvg: read(`../brand/story/scenes/${slug}.svg`),
        people: people(),
        parts: readDir("../brand/story/parts"),
      }),
    actual: () => read(`public/story/canh-${i + 1}-${slug}.svg`),
  }));

  it.each(built)("public file for $slug matches the sources", ({ expected, actual }) => {
    expect(actual()).toBe(expected());
  });

  it.each(built)("$slug is within the budget", ({ actual }) => {
    expect(gz(actual())).toBeLessThanOrEqual(SCENE_BUDGET_BYTES);
  });

  it("all scenes together are within the budget", () => {
    const total = built.reduce((sum, { actual }) => sum + gz(actual()), 0);
    expect(total).toBeLessThanOrEqual(STORY_BUDGET_BYTES);
  });

  it("every pose is at most 12 KB gzip", () => {
    for (const svg of Object.values(people())) expect(gz(svg)).toBeLessThanOrEqual(12 * 1024);
  });

  it.each(built)("$slug uses only palette colors", ({ actual }) => {
    const colors = actual().match(/#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}/g) ?? [];
    for (const c of colors) expect(ILLUSTRATION_PALETTE.has(c.toLowerCase())).toBe(true);
  });
});

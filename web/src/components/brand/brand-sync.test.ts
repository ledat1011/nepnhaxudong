import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildBrandModules } from "../../../scripts/brand-modules.mjs";
import { MASCOT_PIVOTS } from "./generated/mascot";

const MASCOT_PATH = "../brand/mascot/mascot-layered.svg";
const LOGO_ICON_PATH = "../brand/logo/logo-icon.svg";

type Build = (sources: { mascotSvg: string; logoIconSvg: string }) => { mascotTs: string; logoIconTs: string };
const build = buildBrandModules as Build;

const mascotSvg = readFileSync(MASCOT_PATH, "utf8");
const logoIconSvg = readFileSync(LOGO_ICON_PATH, "utf8");

function withMarkup(markup: string): string {
  return mascotSvg.replace("</svg>", `${markup}</svg>`);
}

describe("brand sync", () => {
  it("generated modules match the brand sources", () => {
    const { mascotTs, logoIconTs } = build({ mascotSvg, logoIconSvg });
    expect(readFileSync("src/components/brand/generated/mascot.ts", "utf8")).toBe(mascotTs);
    expect(readFileSync("src/components/brand/generated/logo-icon.ts", "utf8")).toBe(logoIconTs);
  });

  it("the favicon is a byte copy of logo-icon.svg", () => {
    expect(readFileSync("src/app/icon.svg").equals(readFileSync(LOGO_ICON_PATH))).toBe(true);
  });

  it("reads the pivots from data-pivot", () => {
    expect(MASCOT_PIVOTS).toEqual({ head: { x: 278, y: 257 }, rice: { x: 302, y: 356 } });
  });

  it.each([
    "<script>x</script>",
    '<g onload="x">',
    '<image href="https://evil.example/a.png"/>',
    "<foreignObject/>",
  ])("rejects unsafe markup %s", (markup) => {
    expect(() => build({ mascotSvg: withMarkup(markup), logoIconSvg })).toThrow();
  });

  it("rejects a mascot without #hands", () => {
    const broken = mascotSvg.replace('id="hands"', 'id="not-hands"');
    expect(() => build({ mascotSvg: broken, logoIconSvg })).toThrow(/hands/);
  });
});

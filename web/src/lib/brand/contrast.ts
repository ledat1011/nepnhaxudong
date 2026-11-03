import { BRAND } from "./colors";

const HEX_PATTERN = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i;

function linearize(channel: number): number {
  const value = channel / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(hex: string): number {
  const match = HEX_PATTERN.exec(hex);
  if (!match) throw new Error(`Expected a #RRGGBB color, got "${hex}"`);
  const [r, g, b] = [match[1], match[2], match[3]].map((part) =>
    linearize(parseInt(part, 16)),
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two `#RRGGBB` colors (1 to 21). */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** Every text / background pair used on the site. Each must reach 4.5:1. */
export const TEXT_PAIRS: ReadonlyArray<{ name: string; fg: string; bg: string }> = [
  { name: "earth on rice", fg: BRAND.earth, bg: BRAND.rice },
  { name: "coat on rice", fg: BRAND.coat, bg: BRAND.rice },
  { name: "earth on straw", fg: BRAND.earth, bg: BRAND.straw },
  { name: "coat on straw", fg: BRAND.coat, bg: BRAND.straw },
  { name: "rice on coat (button text)", fg: BRAND.rice, bg: BRAND.coat },
  { name: "rice on earth (footer)", fg: BRAND.rice, bg: BRAND.earth },
  { name: "earth on grain (label)", fg: BRAND.earth, bg: BRAND.grain },
];

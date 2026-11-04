export const BRAND = {
  earth: "#4A2C1A",
  coat: "#8B5A2B",
  grain: "#D9A13B",
  straw: "#F2E2B6",
  rice: "#FBF7EE",
  blush: "#E59A84",
  sprout: "#6E8B3D",
} as const;

/** Colors used only inside illustrations, never for text, buttons or UI borders (brand/README.md, decision 0007). */
export const ILLUSTRATION_ONLY_COLORS = {
  skin: "#F4CDA8",
  hair: "#222222",
  sky: "#CFE4EE",
  skyLight: "#E9F2F1",
} as const;

/** Every color an illustration may use, lowercase. */
export const ILLUSTRATION_PALETTE: ReadonlySet<string> = new Set(
  [...Object.values(BRAND), ...Object.values(ILLUSTRATION_ONLY_COLORS)].map((c) => c.toLowerCase()),
);

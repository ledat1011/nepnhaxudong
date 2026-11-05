export const UNSAFE_MARKUP = [
  [/<script/i, "a script element"],
  [/\son[a-z]+\s*=/i, "an event handler attribute"],
  [/(?:xlink:)?href\s*=\s*["']?\s*(?:https?:|\/\/|javascript:)/i, "an external href"],
  [/<foreignObject/i, "a foreignObject element"],
];

export function assertSafe(svg, name) {
  for (const [pattern, what] of UNSAFE_MARKUP) {
    if (pattern.test(svg)) throw new Error(`${name} contains ${what}`);
  }
}

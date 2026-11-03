export const LANGS = ["vi", "en"] as const;

export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "vi";

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

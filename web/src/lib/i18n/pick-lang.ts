import { DEFAULT_LANG, isLang, type Lang } from "./langs";

const DEFAULT_QUALITY = 1;

function parseQuality(params: string[]): number {
  const qParam = params
    .map((param) => param.trim().toLowerCase())
    .find((param) => param.startsWith("q="));
  if (qParam === undefined) {
    return DEFAULT_QUALITY;
  }
  const q = Number(qParam.slice(2));
  return Number.isFinite(q) ? q : 0;
}

/** Picks the supported language with the highest q in an Accept-Language header. */
export function pickLang(acceptLanguage: string | null): Lang {
  if (!acceptLanguage) {
    return DEFAULT_LANG;
  }
  let best: Lang = DEFAULT_LANG;
  let bestQuality = 0;
  for (const entry of acceptLanguage.split(",")) {
    const [range, ...params] = entry.split(";");
    const primary = range.trim().toLowerCase().split("-")[0];
    const quality = parseQuality(params);
    if (isLang(primary) && quality > bestQuality) {
      best = primary;
      bestQuality = quality;
    }
  }
  return best;
}

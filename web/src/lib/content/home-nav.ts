import type { Dictionary } from "@/lib/i18n/dictionaries";
import { SECTION_IDS } from "@/lib/i18n/routes";
import type { HomeData } from "./types";

type SectionId = (typeof SECTION_IDS)[number];

const LABEL_KEYS: Record<SectionId, keyof Dictionary["nav"]> = {
  "san-pham": "product",
  "hanh-trinh": "journey",
  "bao-chi": "press",
  "cau-chuyen": "story",
  "lien-he": "contact",
};

function hasContent(id: SectionId, home: HomeData): boolean {
  switch (id) {
    case "san-pham":
      return home.products.length > 0;
    case "hanh-trinh":
      return home.timeline.length > 0;
    case "bao-chi":
      return home.press.length > 0;
    case "cau-chuyen":
      return home.stories.length > 0;
    case "lien-he":
      return true;
  }
}

/** Menu entries for the sections the home page renders, in page order. */
export function buildHomeNav(
  home: HomeData,
  dict: Dictionary,
): Array<{ id: string; label: string }> {
  return SECTION_IDS.filter((id) => hasContent(id, home)).map((id) => ({
    id,
    label: dict.nav[LABEL_KEYS[id]],
  }));
}

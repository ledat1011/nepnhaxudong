import { homePath, storyPath } from "@/lib/i18n/routes";
import type { ProductAdminDto, StoryAdminDto } from "./types";

/** The anchor of the product section on the public home page (see SECTION_IDS). */
const PRODUCT_SECTION = "san-pham";

/** The public page of a story, in Vietnamese. `null` while the story is a draft or has no Vietnamese slug. */
export function storyPublicHref(story: StoryAdminDto | undefined): string | null {
  if (story === undefined || story.status !== "PUBLISHED" || !story.slug.vi) return null;
  return storyPath("vi", story.slug.vi);
}

/**
 * Where a product shows on the public site: the product section of the Vietnamese home page.
 * Every saved product is shown there today; `null` for a product that is not saved yet.
 */
export function productPublicHref(product: ProductAdminDto | undefined): string | null {
  if (product === undefined) return null;
  return `${homePath("vi")}#${PRODUCT_SECTION}`;
}

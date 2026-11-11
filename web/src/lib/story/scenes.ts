export type SceneSlug =
  | "cay-ma"
  | "nang-mua-gio"
  | "gat"
  | "say"
  | "xay-xat"
  | "dong-goi"
  | "den-tay-khach"
  | "mam-com";

/**
 * A scene picture: the approved flat sketch with manhua ink lines (decision 0014), a 960 x 540
 * WebP with no background bleed, written by brand/tools/cut-story-layers.py.
 */
export type StoryScene = { slug: SceneSlug; src: string; width: 960; height: 540 };

const SLUGS: readonly SceneSlug[] = [
  "cay-ma",
  "nang-mua-gio",
  "gat",
  "say",
  "xay-xat",
  "dong-goi",
  "den-tay-khach",
  "mam-com",
];

export const STORY_SCENES: readonly StoryScene[] = SLUGS.map((slug, i) => ({
  slug,
  src: `/story/canh-${i + 1}-${slug}.webp`,
  width: 960,
  height: 540,
}));

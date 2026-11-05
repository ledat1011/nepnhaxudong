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
 * A scene picture: the approved flat sketch with manhua ink lines (decision 0014), a 1200 x 675
 * WebP with no background bleed. The layered SVG scenes in public/story/*.svg come back when they
 * are rebuilt from these sketches for motion.
 */
export type StoryScene = { slug: SceneSlug; src: string; width: 1200; height: 675 };

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
  width: 1200,
  height: 675,
}));

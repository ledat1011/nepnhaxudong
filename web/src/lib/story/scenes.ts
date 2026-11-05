export type SceneSlug =
  | "cay-ma"
  | "nang-mua-gio"
  | "gat"
  | "say"
  | "xay-xat"
  | "dong-goi"
  | "den-tay-khach"
  | "mam-com";

/** A scene file: the 800 x 600 drawing with a 200-unit background bleed on each side. */
export type StoryScene = { slug: SceneSlug; src: string; width: 1200; height: 600 };

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
  src: `/story/canh-${i + 1}-${slug}.svg`,
  width: 1200,
  height: 600,
}));

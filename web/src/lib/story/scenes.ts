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

/**
 * What the rice is at each step, for the marker that moves down the road (owner, 2026-11-11):
 * a sprouting seed while it grows, paddy from the harvest to the dryer, white rice from the mill
 * to the customer, and a bowl of sticky rice on the table.
 */
export type RiceStage = "seed" | "paddy" | "rice" | "bowl";

export const SCENE_STAGE: Record<SceneSlug, RiceStage> = {
  "cay-ma": "seed",
  "nang-mua-gio": "seed",
  gat: "paddy",
  say: "paddy",
  "xay-xat": "rice",
  "dong-goi": "rice",
  "den-tay-khach": "rice",
  "mam-com": "bowl",
};

export const RICE_STAGES: readonly RiceStage[] = ["seed", "paddy", "rice", "bowl"];

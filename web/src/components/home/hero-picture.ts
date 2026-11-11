import { getImageProps } from "next/image";
import type React from "react";

/**
 * The picture of the home village behind the mascot (Hero.tsx, HeroPicture.tsx, the share image): the real
 * limestone mountain behind the rice field of Duy Tân, the rice field, and the family's 2 kg bag.
 * Drawn from the owner's photo of the mountain and the photo of the real bag; it has no sky
 * objects, because the clouds and the sun below move over it. `bagRight` is the right edge of the
 * bag, as a part of the width: the mascot stands just right of it (`.hero-picture` in globals.css).
 *
 * The picture is wide (3.47 x its height) because it starts left of the bag and must reach the
 * right edge of the hero on every screen. The part right of x = 2400 (low wooded hills and more
 * field, no new landmark) was drawn later to continue the scene: with the first 2400 px only, the
 * picture ended just right of the mascot on a phone and the right of the hero showed only sky.
 * The worst case is the phone layout just under md (767 px): the panel is 216 px high and the
 * bag edge is 288 px from the left, so the picture needs 479 px = 2.22 x its height right of the
 * bag; it has (4191 - 1350) / 1209 = 2.35. The file name changed with the shape (it was
 * nen-que.webp), so no browser or image cache serves the old, narrower picture in the new box.
 */
export const HERO_PICTURE = {
  src: "/hero/nen-que-rong.webp",
  width: 4191,
  height: 1209,
  bagRight: 1350 / 4191,
  /**
   * The picture is as high as the panel, so its width is 4191 / 1209 x the panel height: on a
   * phone 3.47 x (2.5rem + 11rem) = 749 px; from md the hero is 34rem (544 px) high or a little
   * more, so about 1900 to 2100 px. A smaller `sizes` would blur it; a larger one only adds bytes.
   */
  sizes: "(min-width: 48rem) 2000px, 750px",
} as const;

/** The shape of the picture and the bag edge, for `.hero-picture` in globals.css. */
export const HERO_PICTURE_STYLE = {
  "--hero-picture-ratio": HERO_PICTURE.width / HERO_PICTURE.height,
  "--hero-picture-bag": HERO_PICTURE.bagRight,
} as React.CSSProperties;

/** The optimized sources of the hero picture (srcset, sizes, fallback src), as next/image writes them. */
export function heroPictureSources() {
  const { props } = getImageProps({
    src: HERO_PICTURE.src,
    alt: "",
    width: HERO_PICTURE.width,
    height: HERO_PICTURE.height,
    sizes: HERO_PICTURE.sizes,
  });
  return { src: props.src, srcSet: props.srcSet ?? "", sizes: props.sizes ?? HERO_PICTURE.sizes };
}

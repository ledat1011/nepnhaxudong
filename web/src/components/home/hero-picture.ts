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
  /**
   * The sky of the picture is transparent, so the sun (HeroSun) can stand behind the mountain,
   * with part of it hidden. Its center, in picture pixels:
   * - phone: x 2440, y 360, right of the small peak right of the limestone mountain. The mascot
   *   covers the big mountain there, and the small peak is just right of the mascot.
   * - from md (and the share image): x 1893, y 240, behind the right shoulder of the big mountain,
   *   above the mascot's head. The small peak is at the right edge of the screen there, or past
   *   it from 768 to about 1024 px.
   * `size` is its box (rays included) as a part of the picture height: the body is then about
   * 105 px across in the 1209 px picture.
   */
  sun: {
    phone: { x: 2440 / 4191, y: 360 / 1209 },
    wide: { x: 1893 / 4191, y: 240 / 1209 },
    size: 0.365,
  },
} as const;

/** The shape of the picture, the bag edge and the sun place, for `.hero-picture` and `.hero-sun`. */
export const HERO_PICTURE_STYLE = {
  "--hero-picture-ratio": HERO_PICTURE.width / HERO_PICTURE.height,
  "--hero-picture-bag": HERO_PICTURE.bagRight,
  "--hero-sun-x": HERO_PICTURE.sun.phone.x,
  "--hero-sun-y": HERO_PICTURE.sun.phone.y,
  "--hero-sun-md-x": HERO_PICTURE.sun.wide.x,
  "--hero-sun-md-y": HERO_PICTURE.sun.wide.y,
  "--hero-sun-size": HERO_PICTURE.sun.size,
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

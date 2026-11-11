import { getImageProps } from "next/image";

/**
 * The picture of the home village behind the mascot (Hero.tsx, HeroPicture.tsx, the share image): the real
 * limestone mountain behind the rice field of Duy Tân, the rice field, and the family's 2 kg bag.
 * Drawn from the owner's photo of the mountain and the photo of the real bag; it has no sky
 * objects, because the clouds and the sun below move over it. `bagRight` is the right edge of the
 * bag, as a part of the width: the mascot stands just right of it (`.hero-picture` in globals.css).
 */
export const HERO_PICTURE = {
  src: "/hero/nen-que.webp",
  width: 2400,
  height: 1209,
  bagRight: 0.5625,
  /**
   * The picture is as high as the panel, so its width is 2400 / 1209 x the panel height: on a
   * phone 1.99 x (2.5rem + 11rem) = 429 px; from md the hero is 34rem (544 px) high or a little
   * more, so about 1100 to 1200 px. A smaller `sizes` would blur it; a larger one only adds bytes.
   */
  sizes: "(min-width: 48rem) 1200px, 430px",
} as const;

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

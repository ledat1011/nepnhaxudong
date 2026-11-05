import { toImageSrc } from "@/lib/content/image-src";
import type { ImageRef } from "@/lib/content/types";
import { FallbackImage } from "./FallbackImage";

type ContentImageProps = {
  image: ImageRef;
  sizes: string;
  /** Text of the box shown when the file does not load. */
  placeholderLabel: string;
  /**
   * "high" for the top image of a page (its LCP): it loads at once and first. Next 16's
   * `priority` is deprecated and does not write fetchpriority="high" on the <img>.
   */
  fetchPriority?: "high";
  className?: string;
};

/**
 * An image from the API. Callers draw no image box at all when there is no image. The source is
 * built here on the server, because the browser cannot read SITE_URL.
 */
export function ContentImage({
  image,
  sizes,
  placeholderLabel,
  fetchPriority,
  className,
}: ContentImageProps) {
  return (
    <FallbackImage
      src={toImageSrc(image.url)}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      fetchPriority={fetchPriority}
      loading={fetchPriority === "high" ? "eager" : undefined}
      placeholderLabel={placeholderLabel}
      className={className}
    />
  );
}

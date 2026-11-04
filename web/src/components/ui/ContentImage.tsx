import Image from "next/image";
import { ImagePlaceholder } from "@/components/brand/ImagePlaceholder";
import { toImageSrc } from "@/lib/content/image-src";
import type { ImageRef } from "@/lib/content/types";

type ContentImageProps = {
  image: ImageRef | null;
  sizes: string;
  placeholderLabel: string;
  /**
   * "high" for the top image of a page (its LCP): it loads at once and first. Next 16's
   * `priority` is deprecated and does not write fetchpriority="high" on the <img>.
   */
  fetchPriority?: "high";
  className?: string;
};

export function ContentImage({
  image,
  sizes,
  placeholderLabel,
  fetchPriority,
  className,
}: ContentImageProps) {
  if (image === null) {
    return <ImagePlaceholder label={placeholderLabel} className={className} />;
  }
  return (
    <Image
      src={toImageSrc(image.url)}
      alt={image.alt}
      width={image.width}
      height={image.height}
      sizes={sizes}
      fetchPriority={fetchPriority}
      loading={fetchPriority === "high" ? "eager" : undefined}
      className={className}
    />
  );
}

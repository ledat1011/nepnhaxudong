import Image from "next/image";
import { ImagePlaceholder } from "@/components/brand/ImagePlaceholder";
import { toImageSrc } from "@/lib/content/image-src";
import type { ImageRef } from "@/lib/content/types";

type ContentImageProps = {
  image: ImageRef | null;
  sizes: string;
  placeholderLabel: string;
  priority?: boolean;
  className?: string;
};

export function ContentImage({
  image,
  sizes,
  placeholderLabel,
  priority,
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
      priority={priority}
      className={className}
    />
  );
}

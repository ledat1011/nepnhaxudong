import Image from "next/image";
import { ImagePlaceholder } from "@/components/brand/ImagePlaceholder";
import type { ImageRef } from "@/lib/content/types";

type ContentImageProps = {
  image: ImageRef | null;
  sizes: string;
  placeholderLabel: string;
  priority?: boolean;
  className?: string;
};

/** Turns an API image URL into one next/image can load. */
export function toImageSrc(url: string, siteUrl = process.env.SITE_URL): string {
  if (!url.startsWith("/")) return url;
  if (!siteUrl) {
    throw new Error("SITE_URL is required to load images with a relative URL");
  }
  return `${siteUrl.replace(/\/$/, "")}${url}`;
}

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

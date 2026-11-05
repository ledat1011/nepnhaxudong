"use client";

import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { ImagePlaceholder } from "@/components/brand/ImagePlaceholder";

type FallbackImageProps = ImageProps & {
  /** Text of the box shown when the file does not load. */
  placeholderLabel: string;
};

/**
 * next/image that shows the "photo coming soon" box instead of the broken image icon when the
 * file does not load. next/image sets the src again after hydration, so an error from before
 * hydration still reaches `onError`.
 */
export function FallbackImage({ placeholderLabel, alt, className, ...props }: FallbackImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <ImagePlaceholder label={placeholderLabel} className={className} />;
  return <Image {...props} alt={alt} className={className} onError={() => setFailed(true)} />;
}

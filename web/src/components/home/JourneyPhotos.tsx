"use client";

import Image from "next/image";
import { useState } from "react";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type JourneyPhotosProps = {
  /** The milestone's photos, in order; the server builds each `src` (see JourneySection). */
  images: LightboxImage[];
  dict: Dictionary;
};

const FRAME_CLASS =
  "block overflow-hidden rounded-2xl border-2 border-grain bg-rice focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";

type Frame = { className: string; sizes: string };

const SINGLE: Frame = { className: "aspect-[4/3] w-full", sizes: "(min-width: 768px) 24rem, 80vw" };

/**
 * Two or three photos step down the column in a zigzag. The widths add up to 100%, so the
 * bottom-right corner of the first square meets the top-left corner of the 4:3 frame, and
 * the third square comes back to the left under it.
 */
const STAGGER: Frame[] = [
  { className: "aspect-square w-[40%]", sizes: "(min-width: 768px) 12rem, 40vw" },
  { className: "ml-[40%] aspect-[4/3] w-[60%]", sizes: "(min-width: 768px) 17rem, 60vw" },
  { className: "aspect-square w-[40%]", sizes: "(min-width: 768px) 12rem, 40vw" },
];

/** The photos of one journey milestone. A click on a photo shows it large in the lightbox. */
export function JourneyPhotos({ images: all, dict }: JourneyPhotosProps) {
  const [index, setIndex] = useState<number | null>(null);
  // The API allows at most 3 photos per milestone, which is all the zigzag has places for.
  const images = all.slice(0, STAGGER.length);
  if (images.length === 0) return null;
  const frames = images.length === 1 ? [SINGLE] : STAGGER;

  return (
    <div className={`mt-4 ${images.length === 1 ? "max-w-sm" : "max-w-md"}`}>
      {images.map((image, i) => (
        <button
          key={image.src}
          type="button"
          data-journey-photo
          aria-haspopup="dialog"
          // The photo's alt text names the button; a photo without one gets the generic label.
          aria-label={image.alt ? undefined : dict.gallery.viewLarge}
          onClick={(event) => {
            // Safari does not focus a button on click; the lightbox gives focus back to it.
            event.currentTarget.focus();
            setIndex(i);
          }}
          className={`${FRAME_CLASS} ${frames[i].className}`}
        >
          <Image
            src={image.src}
            alt={image.alt}
            width={image.width}
            height={image.height}
            sizes={frames[i].sizes}
            className="h-full w-full object-cover"
          />
        </button>
      ))}
      <Lightbox
        images={images}
        index={index}
        onClose={() => setIndex(null)}
        onIndexChange={setIndex}
        dict={dict}
      />
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState } from "react";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import { frameShape, staggerLayout } from "./journey-stagger";
import type { Dictionary } from "@/lib/i18n/dictionaries";

type JourneyPhotosProps = {
  /** The milestone's photos, in order; the server builds each `src` (see JourneySection). */
  images: LightboxImage[];
  dict: Dictionary;
};

// A single photo keeps the gold border. Overlapping photos have none (the owner found it untidy
// where they overlap): a soft shadow in the earth colour lifts them off the straw background.
const FRAME_CLASS =
  "block overflow-hidden rounded-2xl bg-rice focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";
// Full class names, so Tailwind finds them when it scans the source.
const LIFT = "shadow-[0_10px_24px_-10px_rgb(74_44_26/0.45)]";
// The same shadow plus a ring in the section colour: the groove where this photo overlaps the one below.
const LIFT_WITH_GROOVE = "shadow-[0_0_0_6px_var(--color-straw),0_10px_24px_-10px_rgb(74_44_26/0.45)]";

/** Width of the stage (`max-w-lg`), used to tell the browser how wide each photo is shown. */
const STAGE_REM = 32;
const SINGLE_SIZES = "(min-width: 768px) 24rem, 80vw";

/** The photos of one journey milestone. A click on a photo shows it large in the lightbox. */
export function JourneyPhotos({ images: all, dict }: JourneyPhotosProps) {
  const [index, setIndex] = useState<number | null>(null);
  // The API allows at most 3 photos per milestone, which is all the stage has places for.
  const images = all.slice(0, 3);
  if (images.length === 0) return null;
  // One photo keeps the plain 4:3 frame; two or three overlap at their corners (journey-stagger.ts).
  const stage = images.length === 1 ? null : staggerLayout(images.map((image) => frameShape(image.width, image.height)));

  return (
    <div
      className={stage === null ? "mt-4 max-w-sm" : "relative mt-6 w-full max-w-lg"}
      style={stage === null ? undefined : { aspectRatio: stage.aspectRatio }}
    >
      {images.map((image, i) => {
        const box = stage?.frames[i];
        return (
          <button
            key={image.src}
            type="button"
            data-journey-photo
            data-journey-shape={box?.shape ?? "wide"}
            aria-haspopup="dialog"
            // The photo's alt text names the button; a photo without one gets the generic label.
            aria-label={image.alt ? undefined : dict.gallery.viewLarge}
            onClick={(event) => {
              // Safari does not focus a button on click; the lightbox gives focus back to it.
              event.currentTarget.focus();
              setIndex(i);
            }}
            style={
              box && { left: `${box.left}%`, top: `${box.top}%`, width: `${box.width}%`, height: `${box.height}%` }
            }
            className={`${FRAME_CLASS} ${
              box
                ? // Later frames sit on top; the straw ring is the groove that separates them.
                  `absolute transition-transform duration-200 hover:-translate-y-1 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
                    i > 0 ? LIFT_WITH_GROOVE : LIFT
                  }`
                : "aspect-[4/3] w-full border-2 border-grain"
            }`}
          >
            <Image
              src={image.src}
              alt={image.alt}
              width={image.width}
              height={image.height}
              sizes={
                box ? `(min-width: 768px) ${Math.ceil((STAGE_REM * box.width) / 100)}rem, ${Math.ceil(box.width)}vw` : SINGLE_SIZES
              }
              // Top-aligned: when a frame crops a little, a document keeps its heading.
              className="h-full w-full object-cover object-top"
            />
          </button>
        );
      })}
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

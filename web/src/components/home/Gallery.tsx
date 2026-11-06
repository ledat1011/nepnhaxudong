"use client";

import Image from "next/image";
import { type ReactNode, useState } from "react";
import { ImagePlaceholder } from "@/components/brand/ImagePlaceholder";
import { Lightbox, type LightboxImage } from "@/components/ui/Lightbox";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/** An image with a source the browser can load; the server builds `src` (see ProductSection). */
export type GalleryImage = LightboxImage;

/**
 * A drawing shown before the photos (the bag, ProductBag). It is item 0: the large box shows it
 * first, its thumbnail comes first when there are photos, and it never opens the lightbox.
 */
export type GalleryLead = { main: ReactNode; thumb: ReactNode };

type GalleryProps = {
  images: GalleryImage[];
  dict: Dictionary;
  lead?: GalleryLead;
};

const BOX_CLASS = "block aspect-[4/3] w-full overflow-hidden rounded-2xl bg-straw";
const THUMB_CLASS = "block aspect-[4/3] w-20 overflow-hidden rounded-lg bg-straw";
const THUMB_STATE_CLASS = (pressed: boolean) =>
  pressed ? "ring-2 ring-coat ring-offset-2 ring-offset-rice" : "opacity-80 hover:opacity-100";

const FOCUS_CLASS =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";

export function Gallery({ images, dict, lead }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const count = images.length;
  // With a lead drawing, item 0 is the drawing and the photos are items 1..count.
  const offset = lead ? 1 : 0;
  const photoIndex = index - offset;

  if (count === 0 && !lead) {
    return (
      <ImagePlaceholder
        label={dict.image.placeholder}
        className="aspect-[4/3] w-full rounded-2xl"
      />
    );
  }

  const current = photoIndex >= 0 ? images[photoIndex] : undefined;

  return (
    <div>
      {lead && (
        // Kept in the page while a photo is shown, so the bag motion keeps its elements.
        <div data-gallery-lead hidden={index !== 0} className={BOX_CLASS}>
          {lead.main}
        </div>
      )}
      {current && (
        <button
          type="button"
          aria-label={dict.gallery.viewLarge}
          onClick={(event) => {
            // Safari does not focus a button on click; the lightbox gives focus back to it.
            event.currentTarget.focus();
            setOpen(true);
          }}
          className={`${BOX_CLASS} cursor-zoom-in ${FOCUS_CLASS}`}
        >
          <Image
            src={current.src}
            alt={current.alt}
            width={current.width}
            height={current.height}
            sizes="(min-width: 768px) 50vw, 100vw"
            className="h-full w-full object-cover"
          />
        </button>
      )}

      {count + offset > 1 && (
        <ul className="mt-3 flex gap-2 overflow-x-auto p-1">
          {lead && (
            <li className="shrink-0">
              <button
                type="button"
                aria-label={dict.gallery.bag}
                aria-pressed={index === 0}
                onClick={() => setIndex(0)}
                className={`${THUMB_CLASS} ${FOCUS_CLASS} ${THUMB_STATE_CLASS(index === 0)}`}
              >
                {lead.thumb}
              </button>
            </li>
          )}
          {images.map((image, i) => (
            <li key={image.src} className="shrink-0">
              <button
                type="button"
                aria-pressed={i + offset === index}
                onClick={() => setIndex(i + offset)}
                className={`${THUMB_CLASS} ${FOCUS_CLASS} ${THUMB_STATE_CLASS(i + offset === index)}`}
              >
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes="80px"
                  className="h-full w-full object-cover"
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* The lightbox arrows move through the photos only. */}
      <Lightbox
        images={images}
        index={open && current ? photoIndex : null}
        onClose={() => setOpen(false)}
        onIndexChange={(i) => setIndex(i + offset)}
        dict={dict}
      />
    </div>
  );
}

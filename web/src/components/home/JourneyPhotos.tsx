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

// A single photo keeps the gold border. Overlapping photos have none (the owner found it untidy
// where they overlap): a soft shadow in the earth colour lifts them off the straw background.
const FRAME_CLASS =
  "block overflow-hidden rounded-2xl bg-rice focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-coat";
// Full class names, so Tailwind finds them when it scans the source.
const LIFT = "shadow-[0_10px_24px_-10px_rgb(74_44_26/0.45)]";
// The same shadow plus a ring in the section colour: the groove where this photo overlaps the one below.
const LIFT_WITH_GROOVE = "shadow-[0_0_0_6px_var(--color-straw),0_10px_24px_-10px_rgb(74_44_26/0.45)]";

type Frame = {
  shape: "square" | "wide";
  sizes: string;
  /** Position inside the stage, in percent: left and width of the stage width, top and height of its height. */
  box?: { left: number; top: number; width: number; height: number };
};

const SINGLE: Frame = { shape: "wide", sizes: "(min-width: 768px) 24rem, 80vw" };

/*
 * Two or three photos overlap at their corners (the owner's sketch, option A of 2026-11-06).
 * Every frame has the same height, 46% of the stage width: the squares are 46% wide and the
 * 4:3 frame 61.33%, so a square and a wide photo look the same size. Each next frame starts
 * 74% down the one before and overlaps it by 7.33% of the width; a ring in the section colour
 * around it cuts a rounded groove into the frame below, so the photos never touch.
 * The numbers below are those sizes as percentages of each stage.
 */
const STAGGER_2: { aspect: string; frames: Frame[] } = {
  aspect: "aspect-[100/80.04]",
  frames: [
    { shape: "square", sizes: "(min-width: 768px) 15rem, 46vw", box: { left: 0, top: 0, width: 46, height: 57.47 } },
    { shape: "wide", sizes: "(min-width: 768px) 20rem, 62vw", box: { left: 38.67, top: 42.53, width: 61.33, height: 57.47 } },
  ],
};
const STAGGER_3: { aspect: string; frames: Frame[] } = {
  aspect: "aspect-[100/114.08]",
  frames: [
    { shape: "square", sizes: "(min-width: 768px) 15rem, 46vw", box: { left: 0, top: 0, width: 46, height: 40.32 } },
    { shape: "wide", sizes: "(min-width: 768px) 20rem, 62vw", box: { left: 38.67, top: 29.84, width: 61.33, height: 40.32 } },
    { shape: "square", sizes: "(min-width: 768px) 15rem, 46vw", box: { left: 0, top: 59.68, width: 46, height: 40.32 } },
  ],
};

/** The photos of one journey milestone. A click on a photo shows it large in the lightbox. */
export function JourneyPhotos({ images: all, dict }: JourneyPhotosProps) {
  const [index, setIndex] = useState<number | null>(null);
  // The API allows at most 3 photos per milestone, which is all the stage has places for.
  const images = all.slice(0, STAGGER_3.frames.length);
  if (images.length === 0) return null;
  const stage = images.length === 2 ? STAGGER_2 : images.length === 3 ? STAGGER_3 : null;
  const frames = stage === null ? [SINGLE] : stage.frames;

  return (
    <div className={stage === null ? "mt-4 max-w-sm" : `relative mt-6 w-full max-w-lg ${stage.aspect}`}>
      {images.map((image, i) => {
        const frame = frames[i];
        return (
          <button
            key={image.src}
            type="button"
            data-journey-photo
            data-journey-shape={frame.shape}
            aria-haspopup="dialog"
            // The photo's alt text names the button; a photo without one gets the generic label.
            aria-label={image.alt ? undefined : dict.gallery.viewLarge}
            onClick={(event) => {
              // Safari does not focus a button on click; the lightbox gives focus back to it.
              event.currentTarget.focus();
              setIndex(i);
            }}
            style={
              frame.box && {
                left: `${frame.box.left}%`,
                top: `${frame.box.top}%`,
                width: `${frame.box.width}%`,
                height: `${frame.box.height}%`,
              }
            }
            className={`${FRAME_CLASS} ${
              frame.box
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
              sizes={frame.sizes}
              // Top-aligned: a portrait document keeps its heading when the frame crops it.
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

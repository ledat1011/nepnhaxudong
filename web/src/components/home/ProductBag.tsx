import { useId } from "react";
import { BRAND, ILLUSTRATION_ONLY_COLORS } from "@/lib/brand/colors";
import type { Dictionary } from "@/lib/i18n/dictionaries";
import { Gallery, type GalleryImage } from "./Gallery";

/*
 * The vacuum-packed 2 kg bag, the first item of the product gallery (spec section 3).
 * The bag is slim and upright, like the owner's 2 kg sample: a tall front, a thin side, and the
 * spare film with the heat seal only at the top.
 * The static markup is the final frame of the motion: a firm block with the label on it, no puffy
 * bag, no falling grains, no air. The motion code (lib/motion/product-bag.ts) moves the groups
 * marked with data-bag and the HTML notes marked with data-bag-note.
 * The drawing refers to nothing outside itself, so it can be copied as one file for scene 6.
 * The label text is printed packaging text, so it is the same in both languages. It has no
 * hotline, association logo or QR code from the real bag.
 */

const { earth, coat, grain, straw, rice, sprout } = BRAND;
const { sky, skyLight } = ILLUSTRATION_ONLY_COLORS;

/** The front face: a standing rectangle about 1.7 times as tall as it is wide. */
export const BAG_FRONT = { x: 74, y: 80, width: 118, height: 200 } as const;
/** How far the thin side goes back (to the right), about 1/4 of the front width. */
export const BAG_SIDE_DEPTH = 30;
/** How far the side rises as it goes back, so the thin side shows at a slight angle. */
const SIDE_RISE = 14;

const L = BAG_FRONT.x;
const T = BAG_FRONT.y;
const R = BAG_FRONT.x + BAG_FRONT.width;
const B = BAG_FRONT.y + BAG_FRONT.height;
const BR = R + BAG_SIDE_DEPTH;
const BT = T - SIDE_RISE;
const FRONT = `M${L} ${T}H${R}V${B}H${L}Z`;
const TOP = `M${L} ${T}L${L + BAG_SIDE_DEPTH} ${BT}H${BR}L${R} ${T}Z`;
const SIDE = `M${R} ${T}L${BR} ${BT}V${B - SIDE_RISE}L${R} ${B}Z`;

/** The grains that fall into the bag, at their landing place. The first one turns -20 degrees. */
const FALLING_GRAINS: readonly (readonly [number, number, number])[] = [
  [100, 140, -20],
  [132, 160, 15],
  [160, 130, -35],
  [184, 152, 25],
  [112, 186, -10],
  [148, 196, 30],
  [176, 182, -15],
  [104, 226, 10],
  [140, 232, -30],
  [176, 220, 20],
];

const OUTLINE = {
  stroke: earth,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

/**
 * The drawing. `animated` adds the data-bag hooks and the parts that only show during the
 * motion (puffy bag, falling grains, air). The gallery thumbnail is drawn without them, so the
 * motion code finds each part once.
 */
function BagDrawing({ animated }: { animated: boolean }) {
  // One id per drawing, so the large drawing and its thumbnail never share a pattern.
  const grainsId = `bag-rice-${useId().replace(/[^\w-]/g, "")}`;
  const grains = `url(#${grainsId})`;
  const part = (name: string) => (animated ? { "data-bag": name } : {});

  return (
    <svg
      viewBox="0 0 400 300"
      aria-hidden="true"
      focusable="false"
      className="h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Rice grains packed tight behind the clear film. */}
        <pattern id={grainsId} width="12" height="9" patternUnits="userSpaceOnUse">
          <g fill={grain} fillOpacity="0.4">
            <ellipse cx="2.5" cy="2" rx="2.2" ry="1.3" transform="rotate(-25 2.5 2)" />
            <ellipse cx="8.5" cy="3" rx="2.2" ry="1.3" transform="rotate(40 8.5 3)" />
            <ellipse cx="5" cy="7" rx="2.2" ry="1.3" transform="rotate(10 5 7)" />
          </g>
        </pattern>
      </defs>

      {/* Shadow on the ground. */}
      <ellipse cx="150" cy="281" rx="92" ry="7" fill={coat} fillOpacity="0.18" />

      <g {...part("brick")}>
        {/* Spare film at the mouth, only at the top. */}
        <path
          d="M88 74L84 26Q148 22 212 26L208 74Z"
          fill={skyLight}
          fillOpacity="0.85"
          strokeWidth="1.5"
          {...OUTLINE}
        />
        <path d={FRONT} fill={rice} />
        <path d={TOP} fill={rice} />
        <path d={SIDE} fill={rice} />
        <path d={SIDE} fill={grain} fillOpacity="0.28" />
        <path d={`${FRONT}${TOP}${SIDE}`} fill={grains} strokeWidth="2.5" {...OUTLINE} />
        {/* Shine on the clear film. */}
        <g fill="none" stroke={rice} strokeWidth="3" strokeLinecap="round">
          <path d="M98 64L126 56" />
          <path d="M200 100L214 92" />
          <path d="M200 116L210 110" />
        </g>
      </g>

      {/* The motion code animates this group's opacity; the strokes keep a fixed stroke-opacity. */}
      <g {...part("wrinkles")} fill="none" strokeWidth="1.5" strokeOpacity="0.45" {...OUTLINE}>
        <path d="M100 74q8-3 16-1" />
        <path d="M160 70q10 2 18 0" />
        <path d="M198 150q6-5 8-14" />
        <path d="M200 240q8-4 14-14" />
        <path d="M78 116q4 8 2 18" />
        <path d="M78 270q4-6 3-14" />
      </g>

      {/* The heat seal across the mouth. The motion code draws it from the left. */}
      <g {...part("seal")} fill="none" strokeWidth="5">
        <path d="M90 40H206" stroke={straw} />
        <path d="M90 40H206" stroke={coat} strokeDasharray="1.5 2.5" />
      </g>

      {/* The label, like the one on the real bag. Its centre is near the centre of the front. */}
      <g {...part("label")} fontWeight="700" textAnchor="middle">
        <rect
          x="84"
          y="102"
          width="98"
          height="160"
          rx="6"
          fill={sprout}
          stroke={earth}
          strokeWidth="2"
        />
        <rect x="90" y="108" width="86" height="62" rx="3" fill={sky} />
        <ellipse cx="110" cy="122" rx="11" ry="4" fill={rice} />
        <path d="M90 150Q112 142 133 148T176 144V170H90Z" fill={straw} />
        <path d="M90 158Q118 152 140 160T176 156V170H90Z" fill={grain} />
        <path
          d="M98 170q1-9 5-12M105 170q1-10 6-13M150 170q1-8 4-11"
          fill="none"
          stroke={sprout}
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <rect
          x="90"
          y="108"
          width="86"
          height="62"
          rx="3"
          fill="none"
          stroke={earth}
          strokeWidth="1.2"
        />
        <circle cx="168" cy="166" r="12" fill={grain} stroke={earth} strokeWidth="1.5" />
        <text x="168" y="169" fontSize="8.5" fill={earth}>
          2KG
        </text>
        <text x="133" y="193" fontSize="10.5" fill={rice}>
          <tspan>{"GẠO NẾP "}</tspan>
          <tspan x="133" dy="13">
            CÁI HOA VÀNG
          </tspan>
        </text>
        <text x="133" y="240" fontSize="16" fill={rice}>
          DUY TÂN
        </text>
      </g>

      {/* A small bamboo tray (nong) of loose rice beside the bag. */}
      <g {...part("tray")}>
        <ellipse cx="292" cy="275" rx="64" ry="8" fill={coat} fillOpacity="0.18" />
        <ellipse cx="292" cy="262" rx="62" ry="21" fill={coat} stroke={earth} strokeWidth="2" />
        <ellipse
          cx="292"
          cy="262"
          rx="58"
          ry="18.5"
          fill="none"
          stroke={straw}
          strokeWidth="3"
          strokeDasharray="3 6"
        />
        <ellipse cx="292" cy="263" rx="53" ry="15" fill={straw} stroke={earth} strokeWidth="1.2" />
        <path d="M242 263Q292 224 342 263Q292 278 242 263Z" fill={rice} />
        <path
          d="M242 263Q292 224 342 263Q292 278 242 263Z"
          fill={grains}
          stroke={earth}
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </g>

      {animated && (
        <>
          {/* Before the vacuum: a soft, puffy bag. Hidden in the final frame. */}
          <g data-bag="puffy" opacity="0">
            <path
              d="M72 92Q58 190 76 282H214Q234 190 222 84Q150 58 84 76Q74 82 72 92Z"
              fill={skyLight}
              fillOpacity="0.8"
              strokeWidth="2.5"
              {...OUTLINE}
            />
            <path d="M70 220Q140 236 226 214Q230 250 214 282H76Q68 250 70 220Z" fill={straw} />
          </g>

          {/* Grains falling into the bag. Hidden in the final frame. */}
          <g data-bag="grains" opacity="0" fill={rice} strokeWidth="1.5" {...OUTLINE}>
            {FALLING_GRAINS.map(([cx, cy, turn]) => (
              <ellipse
                key={`${cx}-${cy}`}
                cx={cx}
                cy={cy}
                rx="3.5"
                ry="5.5"
                transform={`rotate(${turn} ${cx} ${cy})`}
              />
            ))}
          </g>

          {/* Air leaving the mouth of the bag. Hidden in the final frame. */}
          <g
            data-bag="air"
            opacity="0"
            fill="none"
            stroke={coat}
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M108 22q-4-5 0-10t0-10" />
            <path d="M148 22q-4-5 0-10t0-10" />
            <path d="M188 22q-4-5 0-10t0-10" />
          </g>
        </>
      )}
    </svg>
  );
}

type ProductBagProps = {
  dict: Dictionary;
  /** The real photos of the product. They follow the drawing in the gallery. */
  images?: GalleryImage[];
};

/** The product gallery with the bag drawing as its first item, and the 3 notes under it. */
export function ProductBag({ dict, images = [] }: ProductBagProps) {
  const notes = [dict.bag.note1, dict.bag.note2, dict.bag.note3];

  return (
    <figure data-product-bag>
      <Gallery
        images={images}
        dict={dict}
        lead={{ main: <BagDrawing animated />, thumb: <BagDrawing animated={false} /> }}
      />
      <ul className="mt-3 space-y-2">
        {notes.map((note) => (
          <li
            key={note}
            data-bag-note
            className="relative pl-6 font-medium before:absolute before:top-[0.45em] before:left-1 before:h-2.5 before:w-2 before:-rotate-12 before:rounded-full before:border before:border-coat before:bg-grain"
          >
            {note}
          </li>
        ))}
      </ul>
    </figure>
  );
}

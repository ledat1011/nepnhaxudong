import { useId } from "react";
import { BRAND, ILLUSTRATION_ONLY_COLORS } from "@/lib/brand/colors";
import type { Dictionary } from "@/lib/i18n/dictionaries";

/*
 * The vacuum-packed 2 kg bag next to the product features (spec section 3).
 * The static markup is the final frame of the motion: a square block with the label on it,
 * no puffy bag, no falling grains, no air. The motion code (Task 6) moves the groups marked
 * with data-bag and the HTML notes marked with data-bag-note.
 * The drawing refers to nothing outside itself, so it can be copied as one file for scene 6.
 * The label text is printed packaging text, so it is the same in both languages. It has no
 * hotline, association logo or QR code from the real bag.
 */

const { earth, coat, grain, straw, rice, sprout } = BRAND;
const { sky, skyLight } = ILLUSTRATION_ONLY_COLORS;

/** Front, top and side faces of the brick, in a 3/4 view. */
const FRONT = "M40 118H236V258H40Z";
const TOP = "M40 118L84 90H280L236 118Z";
const SIDE = "M236 118L280 90V230L236 258Z";

/** The grains that fall into the bag, at their landing place. Hidden in the final frame. */
const FALLING_GRAINS: readonly (readonly [number, number, number])[] = [
  [112, 150, -20],
  [146, 168, 15],
  [172, 138, -35],
  [204, 162, 25],
  [234, 146, -10],
  [124, 196, 30],
  [160, 190, -15],
  [192, 204, 10],
  [222, 186, -30],
  [252, 172, 20],
];

const OUTLINE = {
  stroke: earth,
  strokeLinejoin: "round",
  strokeLinecap: "round",
} as const;

export function ProductBag({ dict }: { dict: Dictionary }) {
  // One id per drawing, so two copies on a page never share a pattern.
  const grainsId = `bag-rice-${useId().replace(/[^\w-]/g, "")}`;
  const grains = `url(#${grainsId})`;
  const notes = [dict.bag.note1, dict.bag.note2, dict.bag.note3];

  return (
    <figure data-product-bag className="mt-6">
      <svg
        viewBox="0 0 400 300"
        aria-hidden="true"
        focusable="false"
        className="mx-auto h-auto w-3/5 md:w-full"
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

        {/* The parts are drawn from y 56; this lifts them so the empty band sits below, not above. */}
        <g transform="translate(0 -22)">
          {/* Shadow on the ground. */}
          <ellipse cx="160" cy="262" rx="130" ry="9" fill={straw} />

          <g data-bag="brick">
            {/* Spare film at the mouth (top) and at the bottom end of the bag. */}
            <g fill={skyLight} fillOpacity="0.85" strokeWidth="1.5" {...OUTLINE}>
              <path d="M86 90L80 62Q182 56 284 62L280 90Z" />
              <path d="M40 258L34 270H232L236 258Z" />
            </g>
            <path d={FRONT} fill={rice} />
            <path d={TOP} fill={rice} />
            <path d={SIDE} fill={straw} />
            <path d={`${FRONT}${TOP}${SIDE}`} fill={grains} strokeWidth="2.5" {...OUTLINE} />
            {/* Shine on the clear film. */}
            <g fill="none" stroke={rice} strokeWidth="3" strokeLinecap="round">
              <path d="M246 128L270 112" />
              <path d="M248 142L262 132" />
              <path d="M110 84L150 72" />
            </g>
          </g>

          <g data-bag="wrinkles" fill="none" strokeWidth="1.5" strokeOpacity="0.45" {...OUTLINE}>
            <path d="M98 108q12-5 24-2" />
            <path d="M196 98q12 4 24-1" />
            <path d="M246 156q8-6 10-16" />
            <path d="M250 214q10-4 18-16" />
            <path d="M45 136q5 8 3 18" />
            <path d="M45 230q5-6 4-14" />
          </g>

          {/* The heat seal across the mouth. The motion code draws it from the left. */}
          <g data-bag="seal" fill="none" strokeWidth="5">
            <path d="M88 73H276" stroke={straw} />
            <path d="M88 73H276" stroke={coat} strokeDasharray="1.5 2.5" />
          </g>

          {/* The label, like the one on the real bag. Its centre is the centre of the front face. */}
          <g data-bag="label" fontWeight="700" textAnchor="middle">
            <rect
              x="54"
              y="130"
              width="168"
              height="116"
              rx="6"
              fill={sprout}
              stroke={earth}
              strokeWidth="2"
            />
            <rect x="61" y="137" width="154" height="50" rx="3" fill={sky} />
            <ellipse cx="92" cy="152" rx="13" ry="4.5" fill={rice} />
            <path d="M61 170Q100 160 138 168T215 164V187H61Z" fill={straw} />
            <path d="M61 178Q110 170 150 180T215 176V187H61Z" fill={grain} />
            <g fill="none" stroke={sprout} strokeWidth="1.5" strokeLinecap="round">
              <path d="M72 187q1-10 6-14M80 187q1-12 7-15M150 187q1-9 5-12" />
            </g>
            <rect
              x="61"
              y="137"
              width="154"
              height="50"
              rx="3"
              fill="none"
              stroke={earth}
              strokeWidth="1.2"
            />
            <circle cx="204" cy="180" r="14" fill={grain} stroke={earth} strokeWidth="1.5" />
            <text x="204" y="183.5" fontSize="9.5" fill={earth}>
              2KG
            </text>
            <text x="138" y="209" fontSize="10.5" fill={rice}>
              GẠO NẾP CÁI HOA VÀNG
            </text>
            <text x="138" y="233" fontSize="16" fill={rice}>
              DUY TÂN
            </text>
          </g>

          {/* A small bamboo tray (nong) of loose rice beside the bag. */}
          <g data-bag="tray">
            <ellipse cx="332" cy="272" rx="60" ry="9" fill={straw} />
            <ellipse cx="332" cy="258" rx="58" ry="21" fill={coat} stroke={earth} strokeWidth="2" />
            <ellipse
              cx="332"
              cy="258"
              rx="54"
              ry="18.5"
              fill="none"
              stroke={straw}
              strokeWidth="3"
              strokeDasharray="3 6"
            />
            <ellipse
              cx="332"
              cy="259"
              rx="49"
              ry="15"
              fill={straw}
              stroke={earth}
              strokeWidth="1.2"
            />
            <path d="M286 259Q332 222 378 259Q332 274 286 259Z" fill={rice} />
            <path
              d="M286 259Q332 222 378 259Q332 274 286 259Z"
              fill={grains}
              stroke={earth}
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
          </g>

          {/* Before the vacuum: a soft, puffy bag. Hidden in the final frame. */}
          <g data-bag="puffy" opacity="0">
            <path
              d="M46 112Q30 190 48 262H262Q296 230 286 150Q284 100 270 86Q170 64 92 86Q56 92 46 112Z"
              fill={skyLight}
              fillOpacity="0.8"
              strokeWidth="2.5"
              {...OUTLINE}
            />
            <path d="M44 214Q160 238 274 204Q280 236 262 262H48Q42 238 44 214Z" fill={straw} />
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
            <path d="M124 54q-4-7 0-13t0-13" />
            <path d="M182 50q-4-7 0-13t0-13" />
            <path d="M240 54q-4-7 0-13t0-13" />
          </g>
        </g>
      </svg>

      <ul className="mt-2 space-y-2">
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

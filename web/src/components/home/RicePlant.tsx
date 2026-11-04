import { BRAND } from "@/lib/brand/colors";

type RicePlantProps = { className?: string };

/** A rice leaf that points to the right. The left end is the point where it joins the stem. */
export function RiceLeaf({ className }: RicePlantProps) {
  return (
    <svg
      data-journey-leaf
      aria-hidden="true"
      viewBox="0 0 20 12"
      width="20"
      height="12"
      className={className}
    >
      <path
        d="M1 11 C4 3 11 1 19 1 C17 8 10 12 1 11 Z"
        fill={BRAND.sprout}
        stroke={BRAND.earth}
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const GRAINS = [
  { cx: 12, cy: 12, rotate: 0 },
  { cx: 7, cy: 18, rotate: -25 },
  { cx: 17, cy: 18, rotate: 25 },
  { cx: 8, cy: 26, rotate: -20 },
  { cx: 16, cy: 26, rotate: 20 },
  { cx: 12, cy: 34, rotate: 0 },
];

/** An ear of rice that hangs from the end of the stem. The top center is where it joins. */
export function RiceEar({ className }: RicePlantProps) {
  return (
    <svg
      data-journey-ear
      aria-hidden="true"
      viewBox="0 0 24 40"
      width="24"
      height="40"
      className={className}
    >
      <path d="M12 0 L12 8" stroke={BRAND.earth} strokeWidth="1.5" strokeLinecap="round" />
      {GRAINS.map((g) => (
        <ellipse
          key={`${g.cx}-${g.cy}`}
          cx={g.cx}
          cy={g.cy}
          rx="3.4"
          ry="5.2"
          transform={`rotate(${g.rotate} ${g.cx} ${g.cy})`}
          fill={BRAND.grain}
          stroke={BRAND.earth}
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}

/**
 * One white rice grain with a dark outline: the falling grains of ProductBag, twice as large.
 * The story road's moving marker. Its center is the middle of the box.
 */
export function RiceGrain({ className }: RicePlantProps) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 20 28"
      width="20"
      height="28"
      className={className}
    >
      <ellipse
        cx="10"
        cy="14"
        rx="7"
        ry="11"
        transform="rotate(-20 10 14)"
        fill={BRAND.rice}
        stroke={BRAND.earth}
        strokeWidth="2.5"
      />
    </svg>
  );
}

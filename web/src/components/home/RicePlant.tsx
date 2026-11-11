import type { ReactNode } from "react";
import { BRAND } from "@/lib/brand/colors";
import type { RiceStage } from "@/lib/story/scenes";

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

/** Ink outline width of the stage icons, in their 32 px box. */
const ICON_INK = 2;

const STAGE_DRAWINGS: Record<RiceStage, ReactNode> = {
  // A straw-coloured seed with a green sprout of two leaves.
  seed: (
    <>
      <path d="M17.5 14 C17 10.5 16.6 8 17 5.5" fill="none" stroke={BRAND.earth} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M17 8.5 C13 8.5 10.5 6.5 9.5 3.5 C13.5 3.5 16 5 17 8.5 Z" fill={BRAND.sprout} stroke={BRAND.earth} strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M17 6.5 C19 3.5 22 2.5 25 3 C24 6 21 7.5 17 6.5 Z" fill={BRAND.sprout} stroke={BRAND.earth} strokeWidth="1.2" strokeLinejoin="round" />
      <ellipse cx="16" cy="22" rx="6" ry="8.5" transform="rotate(-20 16 22)" fill={BRAND.straw} stroke={BRAND.earth} strokeWidth={ICON_INK} />
    </>
  ),
  // A gold paddy grain: its husk has a ridge down the middle and a short awn at the tip.
  paddy: (
    <>
      <path d="M12.3 6.7 L10.6 2.4" stroke={BRAND.earth} strokeWidth="1.6" strokeLinecap="round" />
      <g transform="rotate(-20 16 17)">
        <ellipse cx="16" cy="17" rx="7" ry="11" fill={BRAND.grain} stroke={BRAND.earth} strokeWidth={ICON_INK} />
        <path d="M16 7.5 C17.8 12 17.8 22 16 26.5" fill="none" stroke={BRAND.coat} strokeWidth="1.4" strokeLinecap="round" />
      </g>
    </>
  ),
  // A white rice grain, the shape of the falling grains of ProductBag, with the notch of its germ.
  rice: (
    <g transform="rotate(-20 16 16)">
      <ellipse cx="16" cy="16" rx="7" ry="11" fill={BRAND.rice} stroke={BRAND.earth} strokeWidth={ICON_INK} />
      <path d="M13.2 23.2 Q15.5 25.4 18.2 23.8" fill="none" stroke={BRAND.coat} strokeWidth="1.4" strokeLinecap="round" />
    </g>
  ),
  // A brown bowl of white sticky rice, steaming.
  bowl: (
    <>
      <path d="M12 10 C10 8 14 5.5 12 2.5" fill="none" stroke={BRAND.coat} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M19.5 10 C17.5 8 21.5 5.5 19.5 2.5" fill="none" stroke={BRAND.coat} strokeWidth="1.6" strokeLinecap="round" />
      <path d="M6 18.5 C6.5 12.5 25.5 12.5 26 18.5 Z" fill={BRAND.rice} stroke={BRAND.earth} strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M4 18.5 L28 18.5 C27.5 24.5 22.5 28 16 28 C9.5 28 4.5 24.5 4 18.5 Z" fill={BRAND.coat} stroke={BRAND.earth} strokeWidth="1.8" strokeLinejoin="round" />
      <rect x="12" y="28" width="8" height="2.5" rx="1" fill={BRAND.earth} />
    </>
  ),
};

/**
 * What the rice is at a step of the story, as a 32 px icon: the marker that moves down the story
 * road. Its center is the middle of the box, where the road is.
 */
export function StageIcon({ stage, className }: { stage: RiceStage; className?: string }) {
  return (
    <svg
      data-stage={stage}
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 32 32"
      width="32"
      height="32"
      className={className}
    >
      {STAGE_DRAWINGS[stage]}
    </svg>
  );
}

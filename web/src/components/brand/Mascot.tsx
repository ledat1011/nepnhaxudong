import { BRAND } from "@/lib/brand/colors";

const { earth, coat, grain, straw, rice, blush, sprout } = BRAND;

// Ear tips of the rice bundle: x, y and tilt in degrees.
const EARS = [
  { x: 22, y: 110, tilt: -18 },
  { x: 34, y: 92, tilt: -6 },
  { x: 12, y: 134, tilt: 8 },
] as const;

type MascotProps = {
  className?: string;
  title: string;
};

/** Placeholder mascot. Contains element ids, so render it once per page. */
export function Mascot({ className, title }: MascotProps) {
  return (
    <svg
      viewBox="0 0 240 280"
      role="img"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <title>{title}</title>
      <g id="body" fill={coat} stroke={earth} strokeWidth="4">
        <path d="M110 170h20v26h-20z" fill={rice} />
        <path d="M36 280C36 214 70 192 120 188c50 4 84 26 84 92z" />
        <path d="M100 190q20 22 40 0" fill="none" />
      </g>
      <g id="rice" style={{ transformOrigin: "58px 236px" }}>
        {EARS.map(({ x, y }) => (
          <path
            key={`stalk-${x}`}
            d={`M58 236Q${x - 20} ${y + 60} ${x} ${y}`}
            fill="none"
            stroke={coat}
            strokeWidth="4"
          />
        ))}
        {EARS.map(({ x, y, tilt }) => (
          <ellipse
            key={`ear-${x}`}
            cx={x}
            cy={y - 8}
            rx="7"
            ry="16"
            fill={grain}
            stroke={earth}
            strokeWidth="3"
            transform={`rotate(${tilt} ${x} ${y})`}
          />
        ))}
        <path d="M58 236q-26-10-34 6q16 8 34-6z" fill={sprout} stroke={earth} strokeWidth="3" />
        <circle cx="58" cy="236" r="12" fill={rice} stroke={earth} strokeWidth="4" />
      </g>
      <g id="head" style={{ transformOrigin: "120px 176px" }}>
        <circle cx="120" cy="128" r="46" fill={rice} stroke={earth} strokeWidth="4" />
        <circle cx="90" cy="142" r="9" fill={blush} stroke="none" />
        <circle cx="150" cy="142" r="9" fill={blush} stroke="none" />
        <path d="M108 152q12 12 24 0" fill="none" stroke={earth} strokeWidth="4" />
        <g id="eyes" fill={earth} stroke="none" style={{ transformOrigin: "120px 128px" }}>
          <ellipse cx="102" cy="128" rx="4.5" ry="6" />
          <ellipse cx="138" cy="128" rx="4.5" ry="6" />
        </g>
        <path d="M18 94L120 18l102 76q-102 22-204 0z" fill={straw} stroke={earth} strokeWidth="4" />
        <path d="M52 86q68 18 136 0" fill="none" stroke={grain} strokeWidth="6" />
      </g>
    </svg>
  );
}

import { BRAND } from "@/lib/brand/colors";

const { earth, grain, straw, rice, blush } = BRAND;

/** Icon version of the logo: head with conical hat. Must stay readable at 32px. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="32" cy="32" r="30" fill={straw} />
      <circle cx="32" cy="38" r="16" fill={rice} stroke={earth} strokeWidth="2.5" />
      <circle cx="23" cy="46" r="3.5" fill={blush} />
      <circle cx="41" cy="46" r="3.5" fill={blush} />
      <circle cx="26" cy="42" r="2" fill={earth} />
      <circle cx="38" cy="42" r="2" fill={earth} />
      <path d="M28 49q4 4 8 0" fill="none" stroke={earth} strokeWidth="2" />
      <path d="M6 34L32 8l26 26q-26 8-52 0z" fill={grain} stroke={earth} strokeWidth="2.5" />
    </svg>
  );
}

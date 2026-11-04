import { BRAND } from "@/lib/brand/colors";

type ImagePlaceholderProps = {
  label: string;
  className?: string;
};

/** Stand-in for a missing photo: straw-colored block with one rice ear. */
export function ImagePlaceholder({ label, className }: ImagePlaceholderProps) {
  return (
    <div
      role="img"
      aria-label={label}
      className={`flex items-center justify-center bg-straw ${className ?? ""}`.trim()}
    >
      <svg
        viewBox="0 0 48 64"
        width="48"
        height="64"
        aria-hidden="true"
        focusable="false"
        fill="none"
        strokeLinecap="round"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M24 62Q22 44 24 22" stroke={BRAND.coat} strokeWidth="3" />
        <g fill={BRAND.grain} stroke={BRAND.coat} strokeWidth="2">
          <ellipse cx="24" cy="12" rx="5" ry="10" />
          <ellipse cx="15" cy="26" rx="4.5" ry="9" transform="rotate(-28 15 26)" />
          <ellipse cx="33" cy="26" rx="4.5" ry="9" transform="rotate(28 33 26)" />
        </g>
      </svg>
    </div>
  );
}

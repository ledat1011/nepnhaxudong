import { BRAND } from "@/lib/brand/colors";

const STALK_XS = [60, 180, 300, 420, 540, 660, 780, 900, 1020, 1140] as const;

/** Decorative rice-field strip; place it behind or below a section. */
export function FieldBackdrop({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 1200 160"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M0 90Q150 60 300 90T600 90T900 90T1200 90V160H0z" fill={BRAND.straw} />
      <path d="M0 120Q150 95 300 120T600 120T900 120T1200 120V160H0z" fill={BRAND.grain} opacity="0.55" />
      <g stroke={BRAND.coat} strokeWidth="3" strokeLinecap="round" fill="none">
        {STALK_XS.map((x, i) => (
          <path key={x} d={`M${x} 150Q${x + 6} ${100 - (i % 3) * 8} ${x + 18} ${70 - (i % 3) * 8}`} />
        ))}
      </g>
      <g fill={BRAND.grain} stroke={BRAND.coat} strokeWidth="2">
        {STALK_XS.map((x, i) => {
          const cy = 62 - (i % 3) * 8;
          return <ellipse key={x} cx={x + 20} cy={cy} rx="5" ry="12" transform={`rotate(20 ${x + 20} ${cy})`} />;
        })}
      </g>
    </svg>
  );
}

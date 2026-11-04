import { ImageResponse } from "next/og";
import { BRAND } from "@/lib/brand/colors";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/langs";

const SIZE = { width: 1200, height: 630 };
const { earth, coat, grain, straw, rice, blush, sprout } = BRAND;

// Rice stalks at both sides of the mascot: x of the stalk foot and the height of its ear.
const STALKS = [80, 220, 360, 820, 960, 1100].map((x, i) => ({
  x,
  top: 430 - (i % 3) * 30,
}));

type ImageProps = { params: Promise<{ lang: string }> };

// One image per language, only to give each one its own alt text. The image has no text,
// so it needs no font; the page title and description are already in og:title and og:description.
export async function generateImageMetadata({ params }: ImageProps) {
  const { lang } = await params;
  const alt = getDictionary(isLang(lang) ? lang : DEFAULT_LANG).site.ogImageAlt;
  return [{ id: "default", alt, size: SIZE, contentType: "image/png" }];
}

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: rice }}>
        <svg width={SIZE.width} height={SIZE.height} viewBox="0 0 1200 630">
          <circle cx="1010" cy="150" r="90" fill={grain} />
          <path d="M0 470Q150 430 300 470T600 470T900 470T1200 470V630H0z" fill={straw} />
          <path d="M0 540Q150 505 300 540T600 540T900 540T1200 540V630H0z" fill={grain} opacity="0.55" />
          {STALKS.map(({ x, top }) => (
            <g key={x}>
              <path d={`M${x} 600Q${x + 10} ${top + 80} ${x + 26} ${top}`} stroke={coat} strokeWidth="6" fill="none" />
              <ellipse cx={x + 30} cy={top - 20} rx="10" ry="26" fill={grain} stroke={earth} strokeWidth="4" />
            </g>
          ))}
          <g transform="translate(408 182) scale(1.6)">
            <path d="M36 280C36 214 70 192 120 188c50 4 84 26 84 92z" fill={coat} stroke={earth} strokeWidth="4" />
            <rect x="110" y="170" width="20" height="26" fill={rice} />
            <circle cx="120" cy="128" r="46" fill={rice} stroke={earth} strokeWidth="4" />
            <circle cx="90" cy="142" r="9" fill={blush} />
            <circle cx="150" cy="142" r="9" fill={blush} />
            <ellipse cx="102" cy="128" rx="4.5" ry="6" fill={earth} />
            <ellipse cx="138" cy="128" rx="4.5" ry="6" fill={earth} />
            <path d="M108 152q12 12 24 0" fill="none" stroke={earth} strokeWidth="4" />
            <path d="M18 94L120 18l102 76q-102 22-204 0z" fill={straw} stroke={earth} strokeWidth="4" />
            <path d="M52 86q68 18 136 0" fill="none" stroke={grain} strokeWidth="6" />
            <path d="M58 236q-26-10-34 6q16 8 34-6z" fill={sprout} stroke={earth} strokeWidth="3" />
          </g>
        </svg>
      </div>
    ),
    SIZE,
  );
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";
import { MASCOT_INNER, MASCOT_VIEWBOX } from "@/components/brand/generated/mascot";
import {
  HERO_CLOUD_STARTS,
  HERO_CLOUDS,
  HeroFieldStatic,
  SUN_RAY,
  SUN_RAY_ANGLES,
} from "@/components/home/HeroScene";
import { BRAND, ILLUSTRATION_ONLY_COLORS } from "@/lib/brand/colors";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/langs";

const SIZE = { width: 1200, height: 630 };
const { earth, coat, grain, straw, rice } = BRAND;
const { sky, skyLight } = ILLUSTRATION_ONLY_COLORS;

/*
 * The share card follows the desktop hero (Hero.tsx): the brand name and tagline on the left, the
 * mascot standing on the bottom edge on the right, the sun behind its top-right corner, and the
 * field sized from the mascot width with the same factors as HeroScene.tsx.
 */
const MASCOT = 440;
const MASCOT_LEFT = SIZE.width - 80 - MASCOT;
const MASCOT_CENTER = MASCOT_LEFT + MASCOT / 2;
// HeroScene: the static field is three 1440 x 260 tiles, 14.19 x the mascot width.
const FIELD_WIDTH = MASCOT * 14.19;
const FIELD_HEIGHT = (FIELD_WIDTH * 260) / 4320;
// HeroScene, md: the sun box is w-40 at a 18rem mascot, -top-10 and -right-6 from the mascot box.
const SUN_SCALE = MASCOT / 288;
const SUN = 160 * SUN_SCALE;
const SUN_TOP = SIZE.height - MASCOT - 40 * SUN_SCALE;
const SUN_LEFT = MASCOT_LEFT + MASCOT + 24 * SUN_SCALE - SUN;
// HeroScene: cloud widths in px at the max-width the hero uses on a desktop, and their tops.
const CLOUD_WIDTHS = [144, 112, 152];
const CLOUD_TOPS = [0.04, 0.02, 0.24];

const MASCOT_SRC = `data:image/svg+xml;base64,${Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MASCOT_VIEWBOX}">${MASCOT_INNER}</svg>`,
).toString("base64")}`;

// The site loads these fonts from Google at build time; the image renderer needs the files.
const fontFile = (name: string) => readFile(join(process.cwd(), "assets/fonts", name));

/**
 * The image renderer takes only plain svg elements inside <svg>, so this calls each function
 * component in the tree (they are plain functions of their props here, without hooks).
 */
function inlineComponents(node: ReactNode): ReactNode {
  if (Array.isArray(node)) return Children.map(node, inlineComponents);
  if (!isValidElement(node)) return node;
  const element = node as ReactElement<{ children?: ReactNode }>;
  if (typeof element.type === "function") {
    return inlineComponents((element.type as (props: object) => ReactNode)(element.props));
  }
  const { children, ...props } = element.props;
  return { ...element, props: children === undefined ? props : { ...props, children: inlineComponents(children) } };
}

// The page sizes the field svg with CSS classes, which the image renderer does not read.
const FIELD = cloneElement(inlineComponents(<HeroFieldStatic />) as ReactElement<{ width?: number; height?: number }>, {
  width: FIELD_WIDTH,
  height: FIELD_HEIGHT,
});

type ImageProps = { params: Promise<{ lang: string }> };

// One image per language: the tagline and the alt text are in the page language.
export async function generateImageMetadata({ params }: ImageProps) {
  const { lang } = await params;
  const alt = getDictionary(isLang(lang) ? lang : DEFAULT_LANG).site.ogImageAlt;
  return [{ id: "default", alt, size: SIZE, contentType: "image/png" }];
}

export default async function Image({ params }: ImageProps) {
  const { lang } = await params;
  const { site } = getDictionary(isLang(lang) ? lang : DEFAULT_LANG);
  const [pacifico, quicksand] = await Promise.all([
    fontFile("Pacifico-Regular.ttf"),
    fontFile("Quicksand-700.ttf"),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          position: "relative",
          width: "100%",
          height: "100%",
          overflow: "hidden",
          backgroundImage: `linear-gradient(to bottom, ${sky} 0%, ${skyLight} 50%, ${rice} 95%)`,
        }}
      >
        {HERO_CLOUDS.map((cloud, i) => (
          <svg
            key={cloud.body}
            viewBox="0 0 120 60"
            width={CLOUD_WIDTHS[i]}
            height={CLOUD_WIDTHS[i] / 2}
            style={{
              position: "absolute",
              left: HERO_CLOUD_STARTS[i] * SIZE.width,
              top: CLOUD_TOPS[i] * SIZE.height,
            }}
          >
            <path d={cloud.body} fill={rice} />
            <path d={cloud.belly} fill={skyLight} />
            <path d={cloud.body} fill="none" stroke={earth} strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        ))}
        <svg
          viewBox="0 0 160 160"
          width={SUN}
          height={SUN}
          style={{ position: "absolute", left: SUN_LEFT, top: SUN_TOP }}
        >
          <g fill={straw} stroke={earth} strokeWidth="1.5" strokeLinejoin="round">
            {SUN_RAY_ANGLES.map((angle) => (
              <path key={angle} d={SUN_RAY} transform={`rotate(${angle} 80 80)`} />
            ))}
          </g>
          <circle cx="80" cy="80" r="38" fill={grain} stroke={earth} strokeWidth="2.5" />
          <path d="M57 72A25 25 0 0 1 72 56" fill="none" stroke={straw} strokeWidth="4" strokeLinecap="round" />
        </svg>
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: MASCOT_CENTER - FIELD_WIDTH / 2,
            bottom: 0,
            width: FIELD_WIDTH,
            height: FIELD_HEIGHT,
          }}
        >
          {FIELD}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element -- the image renderer only takes <img> */}
        <img
          src={MASCOT_SRC}
          alt=""
          width={MASCOT}
          height={MASCOT}
          style={{ position: "absolute", left: MASCOT_LEFT, bottom: 0 }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "absolute",
            left: 80,
            top: 170,
            width: MASCOT_LEFT - 120,
            color: earth,
          }}
        >
          <div style={{ fontFamily: "Pacifico", fontSize: 136, lineHeight: 1.3 }}>{site.name}</div>
          <div style={{ fontFamily: "Quicksand", fontSize: 44, fontWeight: 700, color: coat, marginTop: 8 }}>
            {site.tagline}
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "Pacifico", data: pacifico, weight: 400, style: "normal" },
        { name: "Quicksand", data: quicksand, weight: 700, style: "normal" },
      ],
    },
  );
}

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { MASCOT_INNER, MASCOT_VIEWBOX } from "@/components/brand/generated/mascot";
import { HERO_CLOUD_STARTS, HERO_CLOUDS, SUN_RAY, SUN_RAY_ANGLES } from "@/components/home/HeroScene";
import { HERO_PICTURE } from "@/components/home/hero-picture";
import { BRAND, ILLUSTRATION_ONLY_COLORS } from "@/lib/brand/colors";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { DEFAULT_LANG, isLang } from "@/lib/i18n/langs";

const SIZE = { width: 1200, height: 630 };
const { earth, coat, grain, straw, rice } = BRAND;
const { sky, skyLight } = ILLUSTRATION_ONLY_COLORS;
// Trắng gạo as the start of an rgba() color: the image renderer does not read 8-digit hex colors.
const RICE_RGB = `rgba(${[1, 3, 5].map((i) => Number.parseInt(rice.slice(i, i + 2), 16)).join(", ")}`;

/*
 * The share card follows the desktop hero (Hero.tsx): the brand name and tagline on the left, the
 * mascot standing on the bottom edge on the right, the sun behind its top-right corner, and the
 * picture of the home village as high as the card, placed like `.hero-picture` in globals.css:
 * the right edge of the bag 8 px left of the mascot.
 */
const MASCOT = 440;
const MASCOT_LEFT = SIZE.width - 80 - MASCOT;
// The JPEG (assets/og/nen-que.jpg) is the left 2400 x 1209 px of the hero picture, scaled down:
// enough for the card, which ends about 2360 px into the picture. The right part of the hero
// picture would only add bytes to every render.
const OG_PICTURE = { width: 2400, height: 1209 };
const PICTURE_HEIGHT = SIZE.height;
const PICTURE_WIDTH = (PICTURE_HEIGHT * OG_PICTURE.width) / OG_PICTURE.height;
const BAG_RIGHT = (HERO_PICTURE.bagRight * HERO_PICTURE.width * PICTURE_HEIGHT) / HERO_PICTURE.height;
const PICTURE_LEFT = MASCOT_LEFT - 8 - BAG_RIGHT;
// The text column ends before the bag, so no line of text runs over the picture's bag.
const TEXT_LEFT = 80;
const TEXT_WIDTH = 440;
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
// A JPEG copy of the hero picture (public/hero/nen-que-rong.webp): the image renderer takes PNG and
// JPEG, not WebP.
const pictureFile = () => readFile(join(process.cwd(), "assets/og", "nen-que.jpg"));

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
  const [pacifico, quicksand, picture] = await Promise.all([
    fontFile("Pacifico-Regular.ttf"),
    fontFile("Quicksand-700.ttf"),
    pictureFile(),
  ]);
  const pictureSrc = `data:image/jpeg;base64,${picture.toString("base64")}`;

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
        {/* eslint-disable-next-line @next/next/no-img-element -- the image renderer only takes <img> */}
        <img
          src={pictureSrc}
          alt=""
          width={PICTURE_WIDTH}
          height={PICTURE_HEIGHT}
          style={{ position: "absolute", left: PICTURE_LEFT, bottom: 0 }}
        />
        {/* Rice white over the text side, like the hero's side fade, so the text keeps its contrast. */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            left: 0,
            top: 0,
            width: SIZE.width,
            height: SIZE.height,
            backgroundImage: `linear-gradient(to right, ${RICE_RGB}, 0.6) 0px, ${RICE_RGB}, 0.5) ${TEXT_LEFT + TEXT_WIDTH - 60}px, ${RICE_RGB}, 0) ${TEXT_LEFT + TEXT_WIDTH + 60}px)`,
          }}
        />
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
            left: TEXT_LEFT,
            top: 150,
            width: TEXT_WIDTH,
            color: earth,
          }}
        >
          <div style={{ fontFamily: "Pacifico", fontSize: 120, lineHeight: 1.3, whiteSpace: "nowrap" }}>{site.name}</div>
          <div style={{ fontFamily: "Quicksand", fontSize: 38, fontWeight: 700, color: coat, marginTop: 8 }}>
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

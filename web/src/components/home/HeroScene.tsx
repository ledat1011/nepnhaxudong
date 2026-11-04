import { BRAND, ILLUSTRATION_ONLY_COLORS } from "@/lib/brand/colors";

/*
 * The static hero scene: sky with clouds, a sun behind the mascot, a far village and a rice field.
 * It sits in a panel behind the mascot only (Hero.tsx); the text side of the hero stays plain.
 * Every part is decorative (aria-hidden); the content of the hero is HTML text.
 * The motion code (Task 4) moves only the parts marked with data-hero-* attributes.
 * The hero sets `--hero-m`, the mascot width; the field is sized from it.
 *
 * Every moving part (each cloud, each gust of near stalks, the sun body, the sun rays) is its own
 * outermost svg with `will-change: transform`. The motion code moves it with a CSS transform, so
 * the browser moves its layer and repaints nothing. The village and the far and mid rows are one
 * static image (`data-hero-field`) that nothing moves.
 */

/** Left edge of each cloud, as a fraction of the panel width. The motion code starts from here. */
export const HERO_CLOUD_STARTS: readonly number[] = [0.08, 0.42, 0.74];

/** Number of rice-stalk groups that sway together (data-hero-gust), from left to right. */
export const HERO_GUST_COUNT = 5;

const { earth, coat, grain, straw, rice, sprout } = BRAND;
const { skyLight } = ILLUSTRATION_ONLY_COLORS;

const round = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------------------------
// Sky
// ---------------------------------------------------------------------------------------------

/** `top` is a class, so a cloud can sit at a different height on a phone. */
type Cloud = { body: string; belly: string; width: string; maxWidth: string; top: string };

/** Three cloud shapes in a 120 x 60 box with a flat base. The second one is drawn smaller. */
const CLOUDS: readonly Cloud[] = [
  {
    body: "M16 50C4 50 3 35 15 33C13 21 28 15 38 22C42 9 63 5 72 18C80 10 98 14 98 28C111 27 117 43 105 50Z",
    belly: "M14 50C30 44 52 46 66 49C80 45 96 45 105 50Z",
    width: "20%",
    maxWidth: "9rem",
    top: "top-[4%]",
  },
  {
    body: "M20 50C8 50 8 37 19 36C19 25 33 20 42 27C47 15 66 13 73 25C83 19 98 25 96 37C107 37 109 50 99 50Z",
    belly: "M18 50C34 45 56 46 70 49C82 46 94 46 99 50Z",
    width: "13%",
    maxWidth: "7rem",
    top: "top-[2%]",
  },
  {
    body: "M14 50C3 49 4 36 15 35C12 24 25 17 35 23C38 12 55 8 63 19C70 7 92 8 94 24C106 21 117 33 110 42C118 46 113 51 106 50Z",
    belly: "M12 50C28 44 50 45 62 48C78 44 98 44 106 50Z",
    width: "18%",
    maxWidth: "9.5rem",
    top: "top-[24%]",
  },
];

/** Cloud strip across the top half of the scene panel. Each cloud is placed by its `left` percent. */
export function HeroSky() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 h-1/2" aria-hidden="true">
      {CLOUDS.map((cloud, i) => (
        <svg
          key={HERO_CLOUD_STARTS[i]}
          data-hero-cloud=""
          viewBox="0 0 120 60"
          aria-hidden="true"
          focusable="false"
          className={`absolute h-auto will-change-transform ${cloud.top}`}
          style={{
            left: `${HERO_CLOUD_STARTS[i] * 100}%`,
            width: cloud.width,
            maxWidth: cloud.maxWidth,
          }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d={cloud.body} fill={rice} />
          <path d={cloud.belly} fill={skyLight} />
          <path
            d={cloud.body}
            fill="none"
            stroke={earth}
            strokeWidth="2"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Sun
// ---------------------------------------------------------------------------------------------

const SUN_RAY = "M74 30L80 9L86 30Z";
const SUN_RAY_ANGLES = Array.from({ length: 12 }, (_, i) => i * 30);

const SUN_CLASS =
  "pointer-events-none absolute -top-6 -right-14 z-[1] w-28 will-change-transform md:-top-10 md:-right-6 md:w-40 lg:-right-24 lg:w-44";

/**
 * The sun, drawn behind the mascot at the top-right corner of the mascot box. The rays and the
 * body are two svgs on the same box (the rays turn, the body bobs), the body on top.
 */
export function HeroSun() {
  return (
    <>
      <svg
        data-hero-sun-rays=""
        viewBox="0 0 160 160"
        aria-hidden="true"
        focusable="false"
        className={SUN_CLASS}
        xmlns="http://www.w3.org/2000/svg"
      >
        <g fill={straw} stroke={earth} strokeWidth="1.5" strokeLinejoin="round">
          {SUN_RAY_ANGLES.map((angle) => (
            <path key={angle} d={SUN_RAY} transform={angle === 0 ? undefined : `rotate(${angle} 80 80)`} />
          ))}
        </g>
      </svg>
      <svg
        data-hero-sun=""
        viewBox="0 0 160 160"
        aria-hidden="true"
        focusable="false"
        className={SUN_CLASS}
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="80" cy="80" r="38" fill={grain} stroke={earth} strokeWidth="2.5" />
        <path d="M57 72A25 25 0 0 1 72 56" fill="none" stroke={straw} strokeWidth="4" strokeLinecap="round" />
      </svg>
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------------------------

/** The field's viewBox is 0 0 FIELD_W FIELD_H. */
const FIELD_W = 1440;
const FIELD_H = 260;

/** y of the horizon (the rice tops) in the 1440 x 260 field. */
const HORIZON = 196;

/*
 * The mascot's waist is 0.21 of her height above her bottom edge, and she is square, so the
 * horizon must be 0.21 x --hero-m above the bottom of the field. The field keeps its 1440 x 260
 * aspect, so its width is 0.21 x 1440 / (260 - HORIZON) = 4.73 x --hero-m (the class below).
 */

const VILLAGE_BASE = HORIZON + 4;

/** One clump of bamboo: feathery tips that rise to the middle of the clump. */
function bambooClump(x: number, w: number, h: number): string {
  const tips = Math.max(3, Math.round(w / 16));
  let d = `M${x} ${VILLAGE_BASE}`;
  for (let j = 0; j < tips; j++) {
    const t = (j + 0.5) / tips;
    const lift = h * (0.55 + 0.45 * Math.sin(Math.PI * t));
    const tipX = x + w * t + 5;
    const dipX = x + (w * (j + 1)) / tips;
    const dipY = VILLAGE_BASE - lift * (j === tips - 1 ? 0 : 0.72);
    d += `Q${round(tipX)} ${round(VILLAGE_BASE - lift - 8)} ${round(dipX)} ${round(dipY)}`;
  }
  return `${d}Z`;
}

/** A house with walls and a roof whose eaves reach a little past the walls. */
function house(x: number, w: number, h: number): string {
  const eave = VILLAGE_BASE - h * 0.5;
  const ridge = VILLAGE_BASE - h;
  return (
    `M${x + w * 0.12} ${VILLAGE_BASE}V${eave - 6}H${x + w * 0.88}V${VILLAGE_BASE}Z` +
    `M${x - 6} ${eave - 5}Q${x + w * 0.06} ${eave + 2} ${x + w * 0.2} ${ridge}` +
    `H${x + w * 0.8}Q${x + w * 0.94} ${eave + 2} ${x + w + 6} ${eave - 5}Z`
  );
}

const VILLAGE_PATH = [
  ...(
    [
      [0, 70, 34],
      [62, 96, 46],
      [240, 82, 40],
      [318, 54, 28],
      [470, 110, 50],
      [640, 70, 36],
      [802, 98, 46],
      [990, 64, 32],
      [1060, 120, 52],
      [1250, 84, 40],
      [1330, 110, 46],
    ] as const
  ).map(([x, w, h]) => bambooClump(x, w, h)),
  ...(
    [
      [176, 58, 24],
      [380, 76, 28],
      [586, 50, 22],
      [892, 80, 30],
      [1196, 56, 24],
    ] as const
  ).map(([x, w, h]) => house(x, w, h)),
].join("");

/** The far field's top edge: small bumps, like the tops of many far rice plants. */
const FAR_EDGE = Array.from({ length: 72 }, (_, i) => `Q${i * 20 + 10} ${HORIZON - 7} ${i * 20 + 20} ${HORIZON}`).join("");

/** Plump grains along a drooping ear (a quadratic curve), alternating on both sides of it. */
function grains(p0: [number, number], p1: [number, number], p2: [number, number]) {
  const ts = [0.04, 0.14, 0.24, 0.34, 0.44, 0.54, 0.64, 0.74, 0.84, 0.94];
  return ts.map((t, i) => {
    const u = 1 - t;
    const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
    const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
    const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const len = Math.hypot(dx, dy);
    const side = i % 2 === 0 ? 1 : -1;
    const cx = round(x + (-dy / len) * 4 * side);
    const cy = round(y + (dx / len) * 4 * side);
    const angle = round((Math.atan2(dy, dx) * 180) / Math.PI + 90 - 24 * side);
    return { cx, cy, angle };
  });
}

const GRAIN_RX = 5;
const GRAIN_RY = 8.6;

/**
 * One grain: the ellipse rx 5, ry 8.6 turned by `angle` degrees around its center, drawn as two
 * arcs between the ends of its turned x axis. A path needs no `transform`, and every SVG
 * transform is a node the browser walks on each frame of the hero loop (about 1 300 of them when
 * the grains were rotated ellipses), so the field is drawn without any.
 */
function grainPath(cx: number, cy: number, angle: number): string {
  const a = (angle * Math.PI) / 180;
  const dx = round2(GRAIN_RX * Math.cos(a));
  const dy = round2(GRAIN_RX * Math.sin(a));
  const arc = `A${GRAIN_RX} ${GRAIN_RY} ${angle} 0 1`;
  return `M${round2(cx + dx)} ${round2(cy + dy)}${arc} ${round2(cx - dx)} ${round2(cy - dy)}${arc} ${round2(cx + dx)} ${round2(cy + dy)}Z`;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

type StalkShape = {
  id: string;
  stem: string;
  leaves: readonly string[];
  ear: [[number, number], [number, number], [number, number]];
};

/**
 * Three stalk shapes, each about 100 high with its root at (0, 0). The heavy ear hangs down to the
 * right, so the top of the stem bends under its weight.
 */
const STALK_SHAPES: readonly StalkShape[] = [
  {
    id: "nn-hero-stalk-a",
    stem: "M0 0C1-40 4-74 16-98",
    leaves: ["M0-6C-6-30-18-48-34-60C-20-50-8-34 3-16Z", "M2-26C12-40 24-48 38-52C24-42 14-32 5-18Z"],
    ear: [
      [16, -98],
      [42, -106],
      [46, -54],
    ],
  },
  {
    id: "nn-hero-stalk-b",
    stem: "M0 0C-1-34 2-64 10-86",
    leaves: ["M0-6C8-26 20-40 36-48C22-36 12-24 4-12Z"],
    ear: [
      [10, -86],
      [34, -96],
      [38, -46],
    ],
  },
  {
    id: "nn-hero-stalk-c",
    stem: "M0 0C2-44 8-80 22-100",
    leaves: ["M0-8C-8-28-20-40-32-46C-20-36-8-24 2-14Z"],
    ear: [
      [22, -100],
      [48, -104],
      [50, -58],
    ],
  },
];

const SCALES = [1, 0.9, 1.06, 0.94, 1.02, 0.88, 1.08, 0.96, 0.92, 1.04, 0.98];

/** A row of stalks: roots on y, `count` stalks from x0 with step dx, each scaled around `size`. */
function row(y: number, x0: number, dx: number, count: number, size: number) {
  return Array.from({ length: count }, (_, i) => ({
    x: x0 + i * dx + ((i * 37) % 13) - 6,
    y,
    shape: STALK_SHAPES[i % 3].id,
    scale: round(size * SCALES[i % SCALES.length] * 100) / 100,
  }));
}

/** Far rows are smaller (perspective). Only the near row sways (data-hero-gust). */
const FAR_ROW = row(212, 4, 22, 66, 0.26);
const MID_ROW = row(232, 10, 34, 43, 0.4);

/** Stalks per gust group, left to right: 22 near stalks in 5 groups. */
const GUST_SIZES = [4, 4, 5, 4, 5] as const;
/** The near row sits in the middle part of the field, the part a panel shows at most widths. */
const NEAR_ROW = row(260, 250, 45, 22, 0.64);

const GUSTS = GUST_SIZES.map((size, g) => {
  const start = GUST_SIZES.slice(0, g).reduce((a, b) => a + b, 0);
  return NEAR_ROW.slice(start, start + size);
});

type Stalk = (typeof NEAR_ROW)[number];

/**
 * A box around every stalk shape (root at 0 0), a little larger than the drawing: the leaves
 * reach x = -34, the grains of the ear about x = 63 and y = -113.
 */
const STALK_BOX = { left: -40, right: 66, top: -120 } as const;

/**
 * The viewBox of one gust svg, in field units: around its stalks, with its bottom on the field's
 * bottom edge (the roots), where the field svg ends too.
 */
function gustBox(stalks: readonly Stalk[]) {
  const x = Math.floor(Math.min(...stalks.map((s) => s.x + STALK_BOX.left * s.scale)));
  const right = Math.ceil(Math.max(...stalks.map((s) => s.x + STALK_BOX.right * s.scale)));
  const y = Math.floor(Math.min(...stalks.map((s) => s.y + STALK_BOX.top * s.scale)));
  return { x, y, w: right - x, h: FIELD_H - y };
}

const percent = (n: number, of: number) => `${Math.round((n / of) * 100_000) / 1000}%`;

function StalkUse({ s, hook }: { s: Stalk; hook?: boolean }) {
  return (
    <use
      data-hero-stalk={hook ? "" : undefined}
      href={`#${s.shape}`}
      transform={`translate(${s.x} ${s.y}) scale(${s.scale})`}
    />
  );
}

/** The field box: 4.73 x the mascot width, centered, on the bottom of the panel. */
const FIELD_BOX =
  "pointer-events-none absolute bottom-0 left-1/2 w-[calc(var(--hero-m)*4.73)] max-w-none -translate-x-1/2";

// ---------------------------------------------------------------------------------------------
// Static field image
// ---------------------------------------------------------------------------------------------

/** One SVG element as text. The values never contain a quote, `<` or `&`. */
function tag(name: string, attrs: Record<string, string | number>, inner = ""): string {
  const list = Object.entries(attrs)
    .map(([key, value]) => ` ${key}='${value}'`)
    .join("");
  return inner === "" ? `<${name}${list}/>` : `<${name}${list}>${inner}</${name}>`;
}

/** The three stalk shapes, as `<g id>` elements for a `<defs>`. */
const STALK_DEFS = STALK_SHAPES.map((s) =>
  tag(
    "g",
    { id: s.id },
    tag(
      "g",
      { fill: sprout, stroke: earth, "stroke-width": 1.5, "stroke-linejoin": "round" },
      s.leaves.map((d) => tag("path", { d })).join(""),
    ) +
      tag("path", {
        d: `${s.stem}Q${s.ear[1].join(" ")} ${s.ear[2].join(" ")}`,
        fill: "none",
        stroke: coat,
        "stroke-width": 3.5,
        "stroke-linecap": "round",
      }) +
      tag(
        "g",
        { fill: grain, stroke: earth, "stroke-width": 1.6 },
        grains(...s.ear)
          .map(({ cx, cy, angle }) => tag("path", { "data-grain": "", d: grainPath(cx, cy, angle) }))
          .join(""),
      ),
  ),
).join("");

const useStalk = (s: Stalk) =>
  tag("use", { href: `#${s.shape}`, transform: `translate(${s.x} ${s.y}) scale(${s.scale})` });

/** The village, the ground and the far and mid rows: the part of the field that never moves. */
const STATIC_FIELD_SVG = tag(
  "svg",
  { xmlns: "http://www.w3.org/2000/svg", viewBox: `0 0 ${FIELD_W} ${FIELD_H}` },
  tag("defs", {}, STALK_DEFS) +
    tag("path", { d: VILLAGE_PATH, fill: coat, opacity: 0.35 }) +
    tag("path", { d: `M0 ${HORIZON}${FAR_EDGE}V260H0Z`, fill: straw }) +
    tag("path", {
      d: `M0 ${HORIZON}${FAR_EDGE}`,
      fill: "none",
      stroke: earth,
      "stroke-width": 1.5,
      "stroke-linejoin": "round",
    }) +
    tag("g", {}, FAR_ROW.map(useStalk).join("")) +
    tag("path", { d: "M0 218Q360 210 720 218T1440 216V260H0Z", fill: grain, opacity: 0.55 }) +
    tag("g", {}, MID_ROW.map(useStalk).join("")) +
    tag("path", { d: "M0 244Q360 236 720 244T1440 242V260H0Z", fill: grain }),
);

/** A `data:` URL of an SVG text: only the characters a URL cannot hold are escaped. */
export function svgDataUrl(svg: string): string {
  const escaped = svg
    .replace(/%/g, "%25")
    .replace(/#/g, "%23")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E");
  return `data:image/svg+xml,${escaped}`;
}

/** The static part of the field as an image (see HeroField). Exported for the tests. */
export const STATIC_FIELD_IMAGE = svgDataUrl(STATIC_FIELD_SVG);

/**
 * The far village and the rice field at the bottom of the scene panel. It is 4.73 x the mascot
 * width, centered, so the horizon is at the mascot's waist.
 *
 * Two layers on the same box. Below: the static part (village, ground, far and mid rows, about
 * 110 stalks) as one image. The browser draws an image as one item, so the hero loop does not
 * walk 110 stalks on every frame, as it would for an inline svg. Above: one svg per gust of near
 * stalks, placed in percents of the box from its viewBox, so it draws on the same scale. The gust
 * stalks `<use>` the shapes of a hidden defs svg.
 */
export function HeroField() {
  return (
    <>
      {/*
       * A plain img: next/image adds nothing for a data: URL. It is not lazy and has a size, so
       * it is drawn in the first paint and takes no layout shift.
       */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-hero-field=""
        src={STATIC_FIELD_IMAGE}
        alt=""
        aria-hidden="true"
        width={FIELD_W}
        height={FIELD_H}
        draggable={false}
        decoding="sync"
        fetchPriority="high"
        className={`${FIELD_BOX} h-auto select-none`}
      />
      <div className={`${FIELD_BOX} aspect-[1440/260]`} aria-hidden="true">
        <svg
          data-hero-defs=""
          aria-hidden="true"
          focusable="false"
          width="0"
          height="0"
          className="absolute"
          xmlns="http://www.w3.org/2000/svg"
          dangerouslySetInnerHTML={{ __html: `<defs>${STALK_DEFS}</defs>` }}
        />
        {GUSTS.map((stalks) => {
          const box = gustBox(stalks);
          return (
            <svg
              key={stalks[0].x}
              data-hero-gust=""
              viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`}
              aria-hidden="true"
              focusable="false"
              className="absolute will-change-transform"
              style={{
                left: percent(box.x, FIELD_W),
                top: percent(box.y, FIELD_H),
                width: percent(box.w, FIELD_W),
                height: percent(box.h, FIELD_H),
              }}
              xmlns="http://www.w3.org/2000/svg"
            >
              <g>
                {stalks.map((s) => (
                  <StalkUse key={s.x} s={s} hook />
                ))}
              </g>
            </svg>
          );
        })}
      </div>
    </>
  );
}


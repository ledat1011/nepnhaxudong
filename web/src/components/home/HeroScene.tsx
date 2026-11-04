import { BRAND, ILLUSTRATION_ONLY_COLORS } from "@/lib/brand/colors";

/*
 * The static hero background: sky with clouds, a sun behind the mascot, a far village and a rice
 * field. Every part is decorative (aria-hidden); the content of the hero is HTML text.
 * The motion code (Task 4) moves only the groups marked with data-hero-* attributes.
 */

/** Left edge of each cloud, as a fraction of the hero width. The motion code starts from here. */
export const HERO_CLOUD_STARTS: readonly number[] = [0.08, 0.42, 0.74];

/** Number of rice-stalk groups that sway together (data-hero-gust), from left to right. */
export const HERO_GUST_COUNT = 5;

const { earth, coat, grain, straw, rice, sprout } = BRAND;
const { skyLight } = ILLUSTRATION_ONLY_COLORS;

const round = (n: number) => Math.round(n * 10) / 10;

// ---------------------------------------------------------------------------------------------
// Sky
// ---------------------------------------------------------------------------------------------

/** `top` is a class: on a phone the mascot sits at the top, so the small cloud goes lower there. */
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
    top: "top-[62%] md:top-[30%]",
  },
  {
    body: "M14 50C3 49 4 36 15 35C12 24 25 17 35 23C38 12 55 8 63 19C70 7 92 8 94 24C106 21 117 33 110 42C118 46 113 51 106 50Z",
    belly: "M12 50C28 44 50 45 62 48C78 44 98 44 106 50Z",
    width: "18%",
    maxWidth: "9.5rem",
    top: "top-[24%]",
  },
];

/** Full-width cloud strip in the top half of the hero. Each cloud is placed by its `left` percent. */
export function HeroSky() {
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-1/2" aria-hidden="true">
      {CLOUDS.map((cloud, i) => (
        <svg
          key={HERO_CLOUD_STARTS[i]}
          data-hero-cloud=""
          viewBox="0 0 120 60"
          aria-hidden="true"
          focusable="false"
          className={`absolute h-auto ${cloud.top}`}
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

/** The sun, drawn behind the mascot at the top-right corner of the mascot box. */
export function HeroSun() {
  return (
    <svg
      viewBox="0 0 160 160"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute -top-6 -right-14 z-0 w-28 md:-top-10 md:-right-6 md:w-40 lg:-right-24 lg:w-44"
      xmlns="http://www.w3.org/2000/svg"
    >
      <g data-hero-sun-rays="" fill={straw} stroke={earth} strokeWidth="1.5" strokeLinejoin="round">
        {SUN_RAY_ANGLES.map((angle) => (
          <path key={angle} d={SUN_RAY} transform={angle === 0 ? undefined : `rotate(${angle} 80 80)`} />
        ))}
      </g>
      <g data-hero-sun="">
        <circle cx="80" cy="80" r="38" fill={grain} stroke={earth} strokeWidth="2.5" />
        <path d="M57 72A25 25 0 0 1 72 56" fill="none" stroke={straw} strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

// ---------------------------------------------------------------------------------------------
// Field
// ---------------------------------------------------------------------------------------------

const VILLAGE_BASE = 166;

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

/** A house with walls and a roof whose eaves turn up a little at both ends. */
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
  `M0 ${VILLAGE_BASE}H1440V${VILLAGE_BASE + 8}H0Z`,
  ...(
    [
      [0, 70, 40],
      [62, 96, 56],
      [240, 82, 46],
      [318, 54, 32],
      [470, 110, 58],
      [640, 70, 40],
      [802, 98, 54],
      [990, 64, 36],
      [1060, 120, 60],
      [1250, 84, 46],
      [1330, 110, 52],
    ] as const
  ).map(([x, w, h]) => bambooClump(x, w, h)),
  ...(
    [
      [176, 58, 26],
      [380, 76, 32],
      [586, 50, 24],
      [892, 80, 34],
      [1196, 56, 26],
    ] as const
  ).map(([x, w, h]) => house(x, w, h)),
].join("");

/** Grains along a drooping panicle (a quadratic curve), alternating on both sides of it. */
function grains(p0: [number, number], p1: [number, number], p2: [number, number]) {
  const ts = [0.1, 0.22, 0.34, 0.46, 0.58, 0.7, 0.82, 0.94];
  return ts.map((t, i) => {
    const u = 1 - t;
    const x = u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0];
    const y = u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1];
    const dx = 2 * u * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * u * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1]);
    const len = Math.hypot(dx, dy);
    const side = i % 2 === 0 ? 1 : -1;
    const cx = round(x + (-dy / len) * 3 * side);
    const cy = round(y + (dx / len) * 3 * side);
    const angle = round((Math.atan2(dy, dx) * 180) / Math.PI + 90 - 32 * side);
    return { cx, cy, angle };
  });
}

type StalkShape = {
  id: string;
  stem: string;
  leaves: readonly string[];
  panicle: [[number, number], [number, number], [number, number]];
};

/** Two stalk shapes, each with its root at (0, 0) and its heavy head bending to the right. */
const STALK_SHAPES: readonly StalkShape[] = [
  {
    id: "nn-hero-stalk-a",
    stem: "M0 0Q3-62 14-116",
    leaves: ["M0-4C-6-30-20-56-40-74C-24-64-10-44 4-20Z", "M2-30C12-44 24-54 40-58C26-46 14-36 5-22Z"],
    panicle: [
      [14, -116],
      [38, -124],
      [44, -84],
    ],
  },
  {
    id: "nn-hero-stalk-b",
    stem: "M0 0Q-2-54 8-100",
    leaves: ["M0-6C8-28 22-46 42-56C28-42 14-28 4-14Z"],
    panicle: [
      [8, -100],
      [30, -110],
      [36, -72],
    ],
  },
];

/** Stalks per gust group, left to right: 22 stalks in 5 groups. */
const GUST_SIZES = [4, 4, 5, 4, 5] as const;
const STALK_SCALES = [1, 0.86, 1.08, 0.92, 1.02, 0.84, 1.1, 0.95, 0.88, 1.04, 0.9];

/** Root x of each stalk, and its shape and size. Spread across the 1440 wide field. */
const STALKS = Array.from({ length: GUST_SIZES.reduce((a, b) => a + b, 0) }, (_, i) => ({
  x: 22 + i * 66 + ((i * 37) % 23) - 11,
  shape: STALK_SHAPES[i % 3 === 1 ? 1 : 0].id,
  scale: STALK_SCALES[i % STALK_SCALES.length],
}));

const GUSTS = GUST_SIZES.map((size, g) => {
  const start = GUST_SIZES.slice(0, g).reduce((a, b) => a + b, 0);
  return STALKS.slice(start, start + size);
});

/** The far village and the rice field along the bottom of the hero. */
export function HeroField() {
  return (
    <svg
      viewBox="0 0 1440 260"
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      focusable="false"
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-40 w-full md:h-[clamp(13rem,18vw,18rem)]"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {STALK_SHAPES.map((s) => (
          <g key={s.id} id={s.id}>
            <g fill={sprout} stroke={earth} strokeWidth="1.5" strokeLinejoin="round">
              {s.leaves.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
            <path
              d={`${s.stem}Q${s.panicle[1].join(" ")} ${s.panicle[2].join(" ")}`}
              fill="none"
              stroke={coat}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <g fill={grain} stroke={earth} strokeWidth="1.5">
              {grains(...s.panicle).map(({ cx, cy, angle }) => (
                <ellipse key={`${cx} ${cy}`} cx={cx} cy={cy} rx="3.6" ry="6.6" transform={`rotate(${angle} ${cx} ${cy})`} />
              ))}
            </g>
          </g>
        ))}
      </defs>

      <path d={VILLAGE_PATH} fill={coat} opacity="0.35" />

      <path d="M0 162Q180 148 360 158T720 156T1080 160T1440 154V260H0Z" fill={straw} />
      <path
        d="M0 162Q180 148 360 158T720 156T1080 160T1440 154"
        fill="none"
        stroke={earth}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <g fill="none" stroke={coat} strokeWidth="1.5" strokeLinecap="round" opacity="0.45">
        <path d="M120 176Q420 170 700 178" />
        <path d="M760 174Q1060 166 1360 172" />
        <path d="M260 160L200 200M980 160L1040 198" />
      </g>

      <path d="M0 200Q240 184 480 196T960 194T1440 190V260H0Z" fill={grain} opacity="0.55" />
      <path d="M0 238Q360 224 720 236T1440 232V260H0Z" fill={grain} />
      <path
        d="M0 238Q360 224 720 236T1440 232"
        fill="none"
        stroke={earth}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.5"
      />

      {GUSTS.map((stalks) => (
        <g key={stalks[0].x} data-hero-gust="">
          {stalks.map((s) => (
            <use
              key={s.x}
              data-hero-stalk=""
              href={`#${s.shape}`}
              transform={`translate(${s.x} 260)${s.scale === 1 ? "" : ` scale(${s.scale})`}`}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

import type { SceneSlug } from "@/lib/story/scenes";
import type { GsapModules } from "../load-gsap";
import { buildBagTimeline } from "../product-bag";

type Gsap = GsapModules["gsap"];

export type SceneMotion = { intro: gsap.core.Timeline; loop: gsap.core.Timeline | null };

type Parts = Record<string, SVGElement[]>;

/**
 * The `data-part` groups each scene needs (the table of Task 9, tested in
 * lib/story/scene-parts.test.ts). A scene without one of them keeps its static drawing.
 */
const REQUIRED: Record<SceneSlug, readonly string[]> = {
  "cay-ma": ["mother", "farmer", "seedling", "ripple"],
  "nang-mua-gio": ["sun", "cloud", "wind", "rice", "rice-green", "rice-gold", "rain", "rice-sway"],
  gat: ["harvester", "crop", "sack", "driver", "brother", "reel"],
  say: ["air", "paddy", "father", "fan-blades", "coals"],
  "xay-xat": ["brother", "pour-sack", "husk", "rice-flow", "elevator-grain"],
  "dong-goi": ["mother", "lid", "stack-bag"],
  "den-tay-khach": ["truck", "shelf-bag", "mother", "customer", "gift", "wheel"],
  "mam-com": ["dish", "steam"],
};

/** The four dishes, in the order they come to the table. */
const DISH_COUNT = 4;

function collect(svg: SVGSVGElement, slug: SceneSlug): Parts | null {
  const parts: Parts = {};
  for (const name of REQUIRED[slug]) {
    const found = Array.from(svg.querySelectorAll<SVGElement>(`[data-part='${name}']`));
    if (found.length === 0) return null;
    parts[name] = found;
  }
  return parts;
}

const intro = (gsap: Gsap) => gsap.timeline({ paused: true, defaults: { ease: "power2.out" } });
const loop = (gsap: Gsap) => gsap.timeline({ paused: true, repeat: -1, defaults: { ease: "none" } });

/*
 * Rules for every scene below:
 * - The static drawing is the final frame. The intro starts from another frame (`from`, or
 *   `fromTo` where the start must be written out) and ends exactly at the drawing.
 * - `x`, `y` and `rotation` are relative ("-=30"): an svg group already has its own
 *   `transform` attribute, and GSAP reads it as the current x, y, scale and rotation.
 * - A loop uses `to` only, so building it renders nothing. It plays only after the intro.
 * - Only `x`, `y`, `scale*`, `rotation` and `opacity` move.
 */

/** Scene 1: mother and the two farmers bend into one row; the seedlings come up row by row. */
function cayMa(gsap: Gsap, p: Parts): SceneMotion {
  const tl = intro(gsap);
  tl.from([...p.farmer, ...p.mother], { y: "-=14", opacity: 0, duration: 0.5, stagger: 0.15 }, 0);
  // The seedlings are in the file row by row, from the back to the front.
  tl.from(
    p.seedling,
    {
      scale: 0,
      transformOrigin: "50% 100%",
      duration: 0.4,
      ease: "back.out(2)",
      stagger: { amount: 1.3 },
    },
    0.4,
  );

  const lp = loop(gsap);
  lp.to(
    p.ripple,
    {
      scale: 1.12,
      opacity: 0.55,
      transformOrigin: "50% 50%",
      duration: 1.6,
      ease: "sine.inOut",
      yoyo: true,
      repeat: 1,
      stagger: 0.4,
    },
    0,
  );
  return { intro: tl, loop: lp };
}

/** Scene 2: sun, then cloud and rain, then wind; the rice grows and turns from green to gold. */
function nangMuaGio(gsap: Gsap, p: Parts): SceneMotion {
  const tl = intro(gsap);
  tl.from(p.sun, { y: "+=40", opacity: 0, duration: 0.6 }, 0);
  tl.from(p.rice, { scaleY: 0.35, transformOrigin: "50% 100%", duration: 1.4, ease: "power1.out" }, 0.2);
  tl.from(p.cloud, { x: "-=140", opacity: 0, duration: 0.7 }, 0.35);
  tl.from(p.rain, { opacity: 0, duration: 0.3, stagger: 0.03 }, 0.9);
  tl.from(p.wind, { x: "-=60", opacity: 0, duration: 0.5, stagger: 0.15 }, 1.0);
  // The green rice is hidden in the file, under the gold rice that covers it. The gold fades in
  // over the green; only then does the green go, which shows nothing.
  tl.fromTo(p["rice-gold"], { opacity: 0 }, { opacity: 1, duration: 0.6, ease: "none" }, 1.3);
  tl.fromTo(p["rice-green"], { opacity: 1 }, { opacity: 0, duration: 0.1, ease: "none" }, 1.9);

  const lp = loop(gsap);
  lp.to(p.rain, { y: "+=26", opacity: 0, duration: 0.9, ease: "power1.in", repeat: 4, stagger: 0.07 }, 0);
  lp.to(
    p["rice-sway"],
    {
      rotation: "+=3",
      transformOrigin: "50% 100%",
      duration: 1.1,
      ease: "sine.inOut",
      yoyo: true,
      repeat: 3,
      stagger: 0.08,
    },
    0,
  );
  return { intro: tl, loop: lp };
}

/** Scene 3: the harvester drives in, the rice in front bends, the sacks fill, anh 2 carries one. */
function gat(gsap: Gsap, p: Parts): SceneMotion {
  const [harvester] = p.harvester;
  const [brother] = p.brother;
  // The sack on the harvester moves with it. The sack on the shoulder is part of the pose.
  const onMachine = p.sack.filter((s) => harvester.contains(s));
  const ground = p.sack.filter((s) => !harvester.contains(s));

  const tl = intro(gsap);
  tl.from(harvester, { x: "-=360", duration: 1.3 }, 0);
  if (ground.length > 0) tl.from(ground, { y: "-=20", opacity: 0, duration: 0.4, stagger: 0.1 }, 0.2);
  tl.to(p.crop, { rotation: "-=16", transformOrigin: "50% 100%", duration: 0.35, ease: "power1.in", stagger: 0.05 }, 0.9);
  tl.to(p.crop, { rotation: "+=16", duration: 0.5, ease: "back.out(2)", stagger: 0.05 }, 1.25);
  if (onMachine.length > 0) {
    tl.from(onMachine, { scaleY: 0.15, transformOrigin: "50% 100%", duration: 0.6 }, 0.9);
  }
  tl.from(brother, { x: "-=24", opacity: 0, duration: 0.5 }, 1.2);

  const lp = loop(gsap);
  lp.to(p.reel, { rotation: "+=360", transformOrigin: "50% 50%", duration: 3 }, 0);
  return { intro: tl, loop: lp };
}

/** An arrow of scene 4 that points up (through the mesh); the others point right. */
const pointsUp = (el: Element) => (el.getAttribute("href") ?? "").endsWith("-up");

/** Scene 4: ba at the furnace; the hot air runs fan, furnace, under the floor, up through the rice. */
function say(gsap: Gsap, p: Parts): SceneMotion {
  const tl = intro(gsap);
  tl.from(p.father, { x: "-=30", opacity: 0, duration: 0.5 }, 0);
  tl.from(p.paddy, { y: "-=24", opacity: 0, duration: 0.6 }, 0.2);
  // The arrows are in the file in the order the air goes.
  tl.from(
    p.air,
    {
      opacity: 0,
      x: (_i: number, el: Element) => (pointsUp(el) ? "+=0" : "-=12"),
      y: (_i: number, el: Element) => (pointsUp(el) ? "+=12" : "+=0"),
      duration: 0.35,
      stagger: 0.12,
    },
    0.7,
  );

  const lp = loop(gsap);
  lp.to(p["fan-blades"], { rotation: "+=720", transformOrigin: "50% 50%", duration: 2.4 }, 0);
  lp.to(p.coals, { opacity: 0.65, duration: 0.3, ease: "sine.inOut", yoyo: true, repeat: 7 }, 0);
  return { intro: tl, loop: lp };
}

/** Scene 5: anh 2 pours the paddy into the hopper; the husk blows out; white rice runs down. */
function xayXat(gsap: Gsap, p: Parts): SceneMotion {
  const tl = intro(gsap);
  tl.from(p.brother, { x: "-=30", opacity: 0, duration: 0.5 }, 0);
  tl.from(p["pour-sack"], { rotation: "-=25", transformOrigin: "0% 100%", duration: 0.6, ease: "back.out(1.6)" }, 0.3);
  tl.from(p["rice-flow"], { scaleY: 0, transformOrigin: "50% 0%", duration: 0.5 }, 0.9);
  tl.from(p.husk, { opacity: 0, x: "-=30", y: "+=24", duration: 0.4, stagger: 0.08 }, 1.0);

  const lp = loop(gsap);
  // The grains are one slot (56 px) apart, so moving all of them one slot up repeats seamlessly.
  lp.to(p["elevator-grain"], { y: "-=56", duration: 1.2 }, 0);
  return { intro: tl, loop: lp };
}

/** Scene 6: the bag is vacuum packed (the product bag motion), the lid closes, the stack grows. */
function dongGoi(gsap: Gsap, p: Parts, svg: SVGSVGElement): SceneMotion | null {
  const bag = buildBagTimeline(gsap, svg);
  if (!bag) return null;
  const tl = intro(gsap);
  // The bag motion unpacks until 0.5 s, the grains fall in, and it shrinks from 1.4 s.
  tl.add(bag.paused(false), 0);
  tl.from(p.mother, { x: "-=24", opacity: 0, duration: 0.5 }, 0);
  // The lid is up from the start and comes down before the bag shrinks.
  tl.from(p.lid, { y: "-=36", duration: 0.4, ease: "power2.in" }, 0.85);
  tl.from(p["stack-bag"], { y: "-=18", opacity: 0, duration: 0.3, stagger: 0.07 }, 1.6);
  return { intro: tl, loop: null };
}

/**
 * Scene 7: the distributor's truck drives in to the shop, the shelf fills, mother hands a bag to
 * a customer at home, the gift box appears. The wheels turn only while the truck drives in, so
 * the parked truck has no loop: a shake too small to see would still repaint the scene.
 */
function denTayKhach(gsap: Gsap, p: Parts): SceneMotion {
  const [truck] = p.truck;
  const looseWheels = p.wheel.filter((w) => !truck.contains(w));
  const vehicle = [truck, ...looseWheels];

  const tl = intro(gsap);
  tl.from(vehicle, { x: "+=420", duration: 1.3 }, 0);
  // Driving to the left, the wheels turn the other way round.
  tl.from(p.wheel, { rotation: "+=540", transformOrigin: "50% 50%", duration: 1.3 }, 0);
  tl.from(p.mother, { x: "-=20", opacity: 0, duration: 0.5 }, 0);
  tl.from(p.customer, { x: "+=30", opacity: 0, duration: 0.5 }, 0.2);
  tl.from(p["shelf-bag"], { y: "-=10", opacity: 0, duration: 0.3, stagger: 0.035 }, 0.6);
  tl.from(p.gift, { scale: 0, transformOrigin: "50% 100%", duration: 0.45, ease: "back.out(2)" }, 1.7);
  return { intro: tl, loop: null };
}

/** Scene 8: xôi, bánh chưng, chè and rượu nếp come to the table one by one; steam rises. */
function mamCom(gsap: Gsap, p: Parts): SceneMotion | null {
  if (p.dish.length !== DISH_COUNT) return null;
  const tl = intro(gsap);
  tl.from(
    p.dish,
    {
      opacity: 0,
      y: "-=24",
      scale: 0.85,
      transformOrigin: "50% 100%",
      duration: 0.5,
      ease: "back.out(1.7)",
      stagger: 0.4,
    },
    0,
  );
  tl.from(p.steam, { opacity: 0, duration: 0.4, stagger: 0.1 }, 1.4);

  const lp = loop(gsap);
  p.steam.forEach((puff, i) => {
    const at = i * 0.4;
    lp.to(puff, { y: "-=14", opacity: 0, duration: 1.6, ease: "sine.out" }, at);
    // Back to the bowl while it cannot be seen, then it fades in again.
    lp.to(puff, { y: "+=14", duration: 0.05 }, at + 1.6);
    lp.to(puff, { opacity: 1, duration: 0.75, ease: "sine.in" }, at + 1.65);
  });
  return { intro: tl, loop: lp };
}

type Builder = (gsap: Gsap, parts: Parts, svg: SVGSVGElement) => SceneMotion | null;

const BUILDERS: Record<SceneSlug, Builder> = {
  "cay-ma": cayMa,
  "nang-mua-gio": nangMuaGio,
  gat,
  say,
  "xay-xat": xayXat,
  "dong-goi": dongGoi,
  "den-tay-khach": denTayKhach,
  "mam-com": mamCom,
};

const withParts =
  (slug: SceneSlug) =>
  (gsap: Gsap, svg: SVGSVGElement): SceneMotion | null => {
    const parts = collect(svg, slug);
    return parts ? BUILDERS[slug](gsap, parts, svg) : null;
  };

/**
 * The motion of each story scene, built on its inline svg: a paused intro (1.5 to 2.5 s) that
 * plays once and ends at the static drawing, and a paused endless loop for the scene's small
 * repeating motion (null for a scene without one). Returns null when a required part is
 * missing; then the scene keeps its static drawing.
 */
export const SCENE_MOTIONS: Record<
  SceneSlug,
  (gsap: Gsap, svg: SVGSVGElement) => SceneMotion | null
> = {
  "cay-ma": withParts("cay-ma"),
  "nang-mua-gio": withParts("nang-mua-gio"),
  gat: withParts("gat"),
  say: withParts("say"),
  "xay-xat": withParts("xay-xat"),
  "dong-goi": withParts("dong-goi"),
  "den-tay-khach": withParts("den-tay-khach"),
  "mam-com": withParts("mam-com"),
};

export type GsapModules = {
  gsap: typeof import("gsap").gsap;
  ScrollTrigger: typeof import("gsap/ScrollTrigger").ScrollTrigger;
};

/** One setup step of the home page motion. It runs inside `gsap.matchMedia().add(...)`. */
export type MotionSetup = (modules: GsapModules, root: Document) => void;

let pending: Promise<GsapModules> | null = null;

/** Loads GSAP and ScrollTrigger on demand. Every call returns the same promise. */
export function loadGsap(): Promise<GsapModules> {
  pending ??= Promise.all([import("gsap"), import("gsap/ScrollTrigger")]).then(
    ([{ gsap }, { ScrollTrigger }]) => {
      gsap.registerPlugin(ScrollTrigger);
      return { gsap, ScrollTrigger };
    },
  );
  return pending;
}

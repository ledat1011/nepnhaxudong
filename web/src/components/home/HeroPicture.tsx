"use client";

import { useEffect, useRef } from "react";
import { heroPictureSources } from "./hero-picture";

/**
 * The picture of the home village behind the hero, drawn on a canvas.
 *
 * Why a canvas and not an <img>: the browser takes the largest image or text block on the first
 * screen as the Largest Contentful Paint, and a canvas is never a candidate. As an <img>, this
 * decorative picture became the LCP, and Lighthouse then counted all the page's script before
 * it (mobile LCP 4.4 to 5.0 s, Performance 80 to 83, below the goal of 90 and 2.5 s in the spec).
 * As a canvas the LCP stays the brand name, which is the content of the hero.
 * Hero.tsx preloads the same sources with a high fetch priority, so the picture is usually
 * downloaded before this code runs. Without script there is no picture; the sky gradient stays.
 *
 * The canvas has the box of `.hero-picture` (globals.css) and the picture's own shape, so the
 * picture is drawn over the whole canvas. It is drawn again when the box changes size, at the
 * screen's pixel density (at most 2, more would only cost memory).
 */
export function HeroPicture() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const { src, srcSet, sizes } = heroPictureSources();
    const picture = new Image();
    picture.decoding = "async";
    picture.sizes = sizes;
    picture.srcset = srcSet;
    picture.src = src;

    const draw = () => {
      if (!picture.complete || picture.naturalWidth === 0) return;
      const box = canvas.getBoundingClientRect();
      const density = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.round(box.width * density);
      const height = Math.round(box.height * density);
      if (width === 0 || height === 0) return;
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(picture, 0, 0, width, height);
    };

    picture.addEventListener("load", draw);
    const resize = new ResizeObserver(draw);
    resize.observe(canvas);
    return () => {
      picture.removeEventListener("load", draw);
      resize.disconnect();
    };
  }, []);

  return <canvas ref={ref} data-hero-picture="" aria-hidden="true" className="hero-picture" />;
}

import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Vitest has no globals, so Testing Library cannot register its own cleanup.
afterEach(() => {
  cleanup();
});

// jsdom has no layout. ProseMirror asks for the element under a point when the writer clicks in the editor.
if (typeof document.elementFromPoint !== "function") {
  document.elementFromPoint = () => null;
}

// jsdom has no pointer capture. Sonner captures the pointer when a finger presses a toast (to let it swipe away).
for (const name of ["setPointerCapture", "releasePointerCapture", "hasPointerCapture"] as const) {
  if (typeof HTMLElement.prototype[name] !== "function") {
    Object.defineProperty(HTMLElement.prototype, name, {
      configurable: true,
      writable: true,
      value: name === "hasPointerCapture" ? () => false : () => {},
    });
  }
}

// jsdom does not decode images, so HTMLImageElement has no decode(). The hero picture
// (HeroPicture.tsx) decodes its picture before it draws; here it never resolves, as nothing loads.
if (typeof HTMLImageElement !== "undefined" && typeof HTMLImageElement.prototype.decode !== "function") {
  HTMLImageElement.prototype.decode = () => new Promise<void>(() => {});
}

// jsdom has no layout, so no ResizeObserver. The hero picture (HeroPicture.tsx) redraws its canvas when it resizes.
if (typeof globalThis.ResizeObserver !== "function") {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

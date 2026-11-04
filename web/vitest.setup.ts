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

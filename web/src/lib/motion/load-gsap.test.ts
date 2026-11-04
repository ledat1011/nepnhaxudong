import { describe, expect, it, vi } from "vitest";
import { loadGsap } from "./load-gsap";

const chunk = vi.hoisted(() => ({ fail: true, registerPlugin: vi.fn() }));

vi.mock("gsap", () => {
  if (chunk.fail) throw new Error("chunk failed");
  return { gsap: { registerPlugin: chunk.registerPlugin } };
});
vi.mock("gsap/ScrollTrigger", () => ({ ScrollTrigger: { name: "ScrollTrigger" } }));

describe("loadGsap", () => {
  it("loads again after a failed load and then keeps the loaded modules", async () => {
    await expect(loadGsap()).rejects.toThrow();

    chunk.fail = false;
    const modules = await loadGsap();
    expect(chunk.registerPlugin).toHaveBeenCalledWith(modules.ScrollTrigger);
    expect(modules.gsap.registerPlugin).toBe(chunk.registerPlugin);
    expect(loadGsap()).toBe(loadGsap());
    await loadGsap();
    expect(chunk.registerPlugin).toHaveBeenCalledTimes(1);
  });
});

import { describe, expect, it, vi } from "vitest";
import { createLoopController, PAUSED_STORAGE_KEY } from "./loops";

function fakeLoop() {
  return { play: vi.fn(), pause: vi.fn() };
}

describe("loop controller", () => {
  it("plays a loop only while it is visible and not paused", () => {
    const controller = createLoopController(null);
    const loop = fakeLoop();
    const entry = controller.add(loop);
    entry.setVisible(true);
    expect(loop.play).toHaveBeenCalledTimes(1);
    controller.setPaused(true);
    expect(loop.pause).toHaveBeenCalled();
    entry.setVisible(false);
    controller.setPaused(false);
    expect(loop.play).toHaveBeenCalledTimes(1);
  });

  it("starts a new loop paused", () => {
    const controller = createLoopController(null);
    const loop = fakeLoop();
    controller.add(loop);
    expect(loop.pause).toHaveBeenCalled();
    expect(loop.play).not.toHaveBeenCalled();
  });

  it("starts paused when the storage says so", () => {
    const controller = createLoopController({ getItem: () => "1", setItem: vi.fn() });
    const loop = fakeLoop();
    const entry = controller.add(loop);
    entry.setVisible(true);
    expect(controller.isPaused()).toBe(true);
    expect(loop.play).not.toHaveBeenCalled();
  });

  it("saves the choice", () => {
    const setItem = vi.fn();
    const controller = createLoopController({ getItem: () => null, setItem });
    controller.setPaused(true);
    expect(setItem).toHaveBeenLastCalledWith(PAUSED_STORAGE_KEY, "1");
    controller.setPaused(false);
    expect(setItem).toHaveBeenLastCalledWith(PAUSED_STORAGE_KEY, "0");
  });

  it("keeps working when the storage throws", () => {
    const boom = () => {
      throw new Error("blocked");
    };
    const controller = createLoopController({ getItem: boom, setItem: boom });
    expect(controller.isPaused()).toBe(false);
    expect(() => controller.setPaused(true)).not.toThrow();
    expect(controller.isPaused()).toBe(true);
    controller.setPaused(false);
    expect(controller.isPaused()).toBe(false);
  });

  it("works without storage", () => {
    const controller = createLoopController(null);
    controller.setPaused(true);
    expect(controller.isPaused()).toBe(true);
  });

  it("a removed loop is not played again", () => {
    const controller = createLoopController(null);
    const loop = fakeLoop();
    const entry = controller.add(loop);
    entry.setVisible(true);
    controller.setPaused(true);
    entry.remove();
    loop.play.mockClear();
    controller.setPaused(false);
    expect(loop.play).not.toHaveBeenCalled();
  });

  it("tells subscribers", () => {
    const controller = createLoopController(null);
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);
    controller.setPaused(true);
    controller.setPaused(false);
    expect(listener.mock.calls).toEqual([[true], [false]]);
    unsubscribe();
    controller.setPaused(true);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});

import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { getDictionary } from "@/lib/i18n/dictionaries";
import { createLoopController } from "@/lib/motion/loops";
import { MotionPauseButton } from "./MotionPauseButton";

const dict = getDictionary("en");

describe("MotionPauseButton", () => {
  it("shows the pause label and aria-pressed=false", () => {
    render(<MotionPauseButton dict={dict} controller={createLoopController(null)} />);
    const button = screen.getByRole("button", { name: dict.motion.pause, hidden: true });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button).toHaveAttribute("type", "button");
    expect(button).toHaveAttribute("title", dict.motion.pause);
    expect(button.querySelector("svg")).toHaveAttribute("data-glyph", "pause");
  });

  it("is a small round icon button with no visible text", () => {
    render(<MotionPauseButton dict={dict} controller={createLoopController(null)} />);
    const button = screen.getByRole("button", { name: dict.motion.pause, hidden: true });
    expect(button).toHaveTextContent(/^$/);
    expect(button).toHaveClass("size-11", "rounded-full");
    const svg = button.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
    expect(svg).toHaveAttribute("focusable", "false");
  });

  it("keeps one name and title and lets aria-pressed carry the state", () => {
    const controller = createLoopController(null);
    render(<MotionPauseButton dict={dict} controller={controller} />);
    fireEvent.click(screen.getByRole("button", { hidden: true }));
    expect(controller.isPaused()).toBe(true);
    // A toggle button keeps its name; a screen reader says "Pause motion, pressed".
    const button = screen.getByRole("button", { name: dict.motion.pause, hidden: true });
    expect(button).toHaveAttribute("aria-pressed", "true");
    // The title for mouse users says the same as the name, so the two never contradict.
    expect(button).toHaveAttribute("title", dict.motion.pause);
    expect(button.querySelector("svg")).toHaveAttribute("data-glyph", "play");
    fireEvent.click(button);
    expect(controller.isPaused()).toBe(false);
    const again = screen.getByRole("button", { name: dict.motion.pause, hidden: true });
    expect(again).toHaveAttribute("aria-pressed", "false");
    expect(again).toHaveAttribute("title", dict.motion.pause);
    expect(again.querySelector("svg")).toHaveAttribute("data-glyph", "pause");
  });

  it("shows the pressed state when the controller starts paused", () => {
    const controller = createLoopController({ getItem: () => "1", setItem: () => {} });
    render(<MotionPauseButton dict={dict} controller={controller} />);
    const button = screen.getByRole("button", { name: dict.motion.pause, hidden: true });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("title", dict.motion.pause);
  });

  it("follows changes made elsewhere", () => {
    const controller = createLoopController(null);
    render(<MotionPauseButton dict={dict} controller={controller} />);
    act(() => controller.setPaused(true));
    const button = screen.getByRole("button", { name: dict.motion.pause, hidden: true });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button.querySelector("svg")).toHaveAttribute("data-glyph", "play");
  });

  it("has a two-tone focus ring: a Nau dat ring between two Trang gao bands", () => {
    render(<MotionPauseButton dict={dict} controller={createLoopController(null)} />);
    const button = screen.getByRole("button", { hidden: true });
    // Nau dat outline 2 px wide, 2 px away from the button edge.
    expect(button).toHaveClass(
      "focus-visible:outline-2",
      "focus-visible:outline-offset-2",
      "focus-visible:outline-earth",
    );
    // A 6 px Trang gao shadow fills the gap under the outline and 2 px outside it, so the ring
    // always has Trang gao on both sides, whatever the field behind the button shows.
    expect(button).toHaveClass("focus-visible:shadow-[0_0_0_6px_var(--color-rice)]");
    expect(button.className).not.toContain("outline-coat");
  });

  it("has the hidden class until motion is on", () => {
    render(<MotionPauseButton dict={dict} controller={createLoopController(null)} />);
    const button = screen.getByRole("button", { hidden: true });
    expect(button).toHaveClass("hidden");
    expect(button.className).toContain("[html[data-motion=on]_&]:inline-flex");
  });
});

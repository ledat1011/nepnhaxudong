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

  it("toggles the controller and the label on click", () => {
    const controller = createLoopController(null);
    render(<MotionPauseButton dict={dict} controller={controller} />);
    fireEvent.click(screen.getByRole("button", { hidden: true }));
    expect(controller.isPaused()).toBe(true);
    const button = screen.getByRole("button", { name: dict.motion.resume, hidden: true });
    expect(button).toHaveAttribute("aria-pressed", "true");
    expect(button).toHaveAttribute("title", dict.motion.resume);
    expect(button.querySelector("svg")).toHaveAttribute("data-glyph", "play");
    fireEvent.click(button);
    expect(controller.isPaused()).toBe(false);
    const again = screen.getByRole("button", { name: dict.motion.pause, hidden: true });
    expect(again.querySelector("svg")).toHaveAttribute("data-glyph", "pause");
  });

  it("shows resume when the controller starts paused", () => {
    const controller = createLoopController({ getItem: () => "1", setItem: () => {} });
    render(<MotionPauseButton dict={dict} controller={controller} />);
    const button = screen.getByRole("button", { name: dict.motion.resume, hidden: true });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("follows changes made elsewhere", () => {
    const controller = createLoopController(null);
    render(<MotionPauseButton dict={dict} controller={controller} />);
    act(() => controller.setPaused(true));
    const button = screen.getByRole("button", { name: dict.motion.resume, hidden: true });
    expect(button.querySelector("svg")).toHaveAttribute("data-glyph", "play");
  });

  it("has the hidden class until motion is on", () => {
    render(<MotionPauseButton dict={dict} controller={createLoopController(null)} />);
    const button = screen.getByRole("button", { hidden: true });
    expect(button).toHaveClass("hidden");
    expect(button.className).toContain("[html[data-motion=on]_&]:inline-flex");
  });
});

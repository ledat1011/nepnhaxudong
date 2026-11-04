import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SaveBar } from "./SaveBar";

describe("SaveBar", () => {
  it("disables Save when nothing changed", () => {
    render(<SaveBar dirty={false} pending={false} onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
  });

  it("disables Save while saving and shows the progress", () => {
    render(<SaveBar dirty pending onSave={() => {}} onCancel={() => {}} />);
    expect(screen.getByRole("button", { name: "Đang lưu…" })).toBeDisabled();
  });

  it("calls onSave and onCancel", async () => {
    const onSave = vi.fn();
    const onCancel = vi.fn();
    const events = userEvent.setup();
    render(<SaveBar dirty pending={false} onSave={onSave} onCancel={onCancel} />);
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    await events.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("sticks above the bottom navigation", () => {
    const { container } = render(<SaveBar dirty pending={false} onSave={() => {}} onCancel={() => {}} />);
    expect(container.firstElementChild).toHaveClass("fixed");
    expect(container.firstElementChild?.className).toContain("safe-area-inset-bottom");
  });
});

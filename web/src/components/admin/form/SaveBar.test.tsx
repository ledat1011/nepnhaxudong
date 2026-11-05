import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SaveBar } from "./SaveBar";

describe("SaveBar", () => {
  it("disables Save when nothing changed", () => {
    render(<SaveBar dirty={false} pending={false} onSave={() => {}} onDiscard={() => {}} />);
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bỏ thay đổi" })).toBeDisabled();
  });

  it("disables Save while saving and shows the progress", () => {
    render(<SaveBar dirty pending onSave={() => {}} onDiscard={() => {}} />);
    expect(screen.getByRole("button", { name: "Đang lưu…" })).toBeDisabled();
  });

  it("can wait for another write without saying it saves", () => {
    render(<SaveBar dirty pending={false} waiting onSave={() => {}} onDiscard={() => {}} />);
    expect(screen.getByRole("button", { name: "Lưu" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Bỏ thay đổi" })).toBeDisabled();
  });

  it("calls onSave", async () => {
    const onSave = vi.fn();
    const events = userEvent.setup();
    render(<SaveBar dirty pending={false} onSave={onSave} onDiscard={() => {}} />);
    await events.click(screen.getByRole("button", { name: "Lưu" }));
    expect(onSave).toHaveBeenCalledTimes(1);
  });

  it("asks before it drops the changes, and keeps them when the user goes back to editing", async () => {
    const onDiscard = vi.fn();
    const events = userEvent.setup();
    render(<SaveBar dirty pending={false} onSave={() => {}} onDiscard={onDiscard} />);
    await events.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
    const question = screen.getByRole("alertdialog", { name: "Bỏ thay đổi chưa lưu?" });
    await events.click(screen.getByRole("button", { name: "Tiếp tục sửa" }));
    expect(question).not.toBeInTheDocument();
    expect(onDiscard).not.toHaveBeenCalled();

    await events.click(screen.getByRole("button", { name: "Bỏ thay đổi" }));
    const again = screen.getByRole("alertdialog", { name: "Bỏ thay đổi chưa lưu?" });
    await events.click(within(again).getByRole("button", { name: "Bỏ thay đổi" }));
    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it("shows a notice next to the buttons while a field is wrong", () => {
    render(<SaveBar dirty pending={false} onSave={() => {}} onDiscard={() => {}} notice="Chưa lưu. Hãy sửa ô có viền đỏ." />);
    expect(screen.getByRole("alert")).toHaveTextContent("Chưa lưu. Hãy sửa ô có viền đỏ.");
  });

  it("sticks above the bottom navigation", () => {
    const { container } = render(<SaveBar dirty pending={false} onSave={() => {}} onDiscard={() => {}} />);
    expect(container.firstElementChild).toHaveClass("fixed");
    expect(container.firstElementChild?.className).toContain("safe-area-inset-bottom");
  });
});

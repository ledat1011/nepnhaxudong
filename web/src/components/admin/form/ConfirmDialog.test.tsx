import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmDialog } from "./ConfirmDialog";

describe("ConfirmDialog", () => {
  it("shows nothing while closed", () => {
    render(<ConfirmDialog open={false} onOpenChange={() => {}} title="Xóa?" description="Mô tả" confirmLabel="Xóa" onConfirm={() => {}} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("confirms and asks to close", async () => {
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();
    const events = userEvent.setup();
    render(<ConfirmDialog open onOpenChange={onOpenChange} title="Xóa ảnh?" description="Không hoàn tác được." confirmLabel="Xóa" destructive onConfirm={onConfirm} />);
    expect(screen.getByRole("alertdialog", { name: "Xóa ảnh?" })).toHaveTextContent("Không hoàn tác được.");
    await events.click(screen.getByRole("button", { name: "Xóa" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("does not confirm on Cancel", async () => {
    const onConfirm = vi.fn();
    const events = userEvent.setup();
    render(<ConfirmDialog open onOpenChange={() => {}} title="Xóa?" description="d" confirmLabel="Xóa" onConfirm={onConfirm} />);
    await events.click(screen.getByRole("button", { name: "Hủy" }));
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

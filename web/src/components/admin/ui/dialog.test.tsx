import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";

describe("DialogContent close button", () => {
  it("is labelled in Vietnamese and is a 44 px tap target", () => {
    render(
      <Dialog open>
        <DialogContent>
          <DialogTitle>Tiêu đề</DialogTitle>
          <DialogDescription>Mô tả</DialogDescription>
        </DialogContent>
      </Dialog>,
    );
    const close = screen.getByRole("button", { name: "Đóng" });
    expect(close).toHaveClass("size-11");
    expect(screen.queryByText("Close")).not.toBeInTheDocument();
  });
});

function FormDialog({ onOpenAutoFocus }: { onOpenAutoFocus?: (event: Event) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <button type="button" onClick={() => setOpen(true)}>
        Mở
      </button>
      <DialogContent onOpenAutoFocus={onOpenAutoFocus}>
        <DialogTitle>Sửa ảnh</DialogTitle>
        <DialogDescription>Mô tả</DialogDescription>
        <label htmlFor="alt">Mô tả ảnh</label>
        <input id="alt" defaultValue="Ruộng lúa" />
      </DialogContent>
    </Dialog>
  );
}

describe("DialogContent focus on open", () => {
  it("focuses the dialog itself, not the first box, so the phone keyboard stays closed and no text is selected", async () => {
    const events = userEvent.setup();
    render(<FormDialog />);
    await events.click(screen.getByRole("button", { name: "Mở" }));
    const dialog = await screen.findByRole("dialog", { name: "Sửa ảnh" });
    const box = screen.getByLabelText("Mô tả ảnh") as HTMLInputElement;
    expect(box).not.toHaveFocus();
    expect(dialog).toHaveFocus();
    expect(box.selectionEnd! - box.selectionStart!).toBe(0);
  });

  it("lets a dialog choose its own focus", async () => {
    const events = userEvent.setup();
    const own = vi.fn((event: Event) => {
      event.preventDefault();
      (document.getElementById("alt") as HTMLInputElement).focus();
    });
    render(<FormDialog onOpenAutoFocus={own} />);
    await events.click(screen.getByRole("button", { name: "Mở" }));
    await screen.findByRole("dialog", { name: "Sửa ảnh" });
    expect(own).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Mô tả ảnh")).toHaveFocus();
  });

  it("keeps Tab inside the dialog, starting at the first box", async () => {
    const events = userEvent.setup();
    render(<FormDialog />);
    await events.click(screen.getByRole("button", { name: "Mở" }));
    await screen.findByRole("dialog", { name: "Sửa ảnh" });
    await events.tab();
    expect(screen.getByLabelText("Mô tả ảnh")).toHaveFocus();
  });
});

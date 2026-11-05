import { act, render, screen } from "@testing-library/react";
import { toast } from "sonner";
import { afterEach, describe, expect, it } from "vitest";
import { Toaster } from "./sonner";

afterEach(() => {
  act(() => toast.dismiss());
});

describe("Toaster", () => {
  it("shows a short message at the top of the screen, away from the bottom menu and the Lưu bar", async () => {
    const { container } = render(<Toaster />);
    act(() => {
      toast.success("Đã lưu.");
    });
    expect(await screen.findByText("Đã lưu.")).toBeInTheDocument();
    const list = container.ownerDocument.querySelector("[data-sonner-toaster]");
    expect(list).toHaveAttribute("data-y-position", "top");
    expect(list).toHaveAttribute("data-x-position", "center");
  });

  it("gives an action button a 44 px tap target", async () => {
    render(<Toaster />);
    act(() => {
      toast("Đã xóa quy cách 1.", { action: { label: "Hoàn tác", onClick: () => {} } });
    });
    const undo = await screen.findByRole("button", { name: "Hoàn tác" });
    expect(undo.className).toContain("min-h-11");
  });

  it("starts below the header row, so Quay lại and Xem trên web stay visible", async () => {
    const { container } = render(<Toaster />);
    act(() => {
      toast.success("Đã lưu.");
    });
    await screen.findByText("Đã lưu.");
    const list = container.ownerDocument.querySelector<HTMLElement>("[data-sonner-toaster]")!;
    // The header row is 56 px high (sticky list header) or 52 px (detail page); 4rem is 64 px.
    expect(list.style.getPropertyValue("--mobile-offset-top")).toBe("4rem");
    expect(list.style.getPropertyValue("--offset-top")).toBe("4rem");
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
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

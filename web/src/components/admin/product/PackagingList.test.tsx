import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { toast } from "sonner";
import { afterEach, describe, expect, it } from "vitest";
import { Toaster } from "@/components/admin/ui/sonner";
import { PackagingList, newPackagingRow, type PackagingRow } from "./PackagingList";

afterEach(() => {
  act(() => toast.dismiss());
});

function Harness({ initial }: { initial: PackagingRow[] }) {
  const [rows, setRows] = useState(initial);
  return (
    <>
      <PackagingList rows={rows} showPrice onChange={setRows} />
      <Toaster />
    </>
  );
}

const weights = () => screen.queryAllByLabelText(/^Khối lượng/).map((box) => (box as HTMLInputElement).value);

describe("PackagingList", () => {
  it("removes a pack size at once and brings it back with Hoàn tác", async () => {
    const events = userEvent.setup();
    render(<Harness initial={[newPackagingRow("500", "60000"), newPackagingRow("1000", "110000")]} />);
    await events.click(screen.getByRole("button", { name: "Xóa quy cách 1" }));
    expect(weights()).toEqual(["1000"]);

    const message = (await screen.findByText("Đã xóa quy cách 1 (500 g).")).closest("li")!;
    await events.click(within(message).getByRole("button", { name: "Hoàn tác" }));
    expect(weights()).toEqual(["500", "1000"]);
    expect(screen.getAllByLabelText("Giá (VND)").map((box) => (box as HTMLInputElement).value)).toEqual(["60000", "110000"]);
  });

  it("keeps the delete button away from the move buttons", () => {
    render(<Harness initial={[newPackagingRow("500")]} />);
    const remove = screen.getByRole("button", { name: "Xóa quy cách 1" });
    const down = screen.getByRole("button", { name: "Đưa quy cách 1 xuống" });
    expect(remove.parentElement).toBe(down.parentElement);
    expect(remove).toHaveClass("ml-auto");
  });
});

import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { toast } from "sonner";
import { afterEach, describe, expect, it } from "vitest";
import { Toaster } from "@/components/admin/ui/sonner";
import { PackagingList, newPackagingRow, packagingErrorKey, type PackagingRow } from "./PackagingList";

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

  it("puts the delete button last in the row, after the move buttons (the full-stack test measures the gap)", () => {
    render(<Harness initial={[newPackagingRow("500")]} />);
    const remove = screen.getByRole("button", { name: "Xóa quy cách 1" });
    const buttons = within(remove.parentElement!).getAllByRole("button");
    expect(buttons.map((b) => b.getAttribute("aria-label"))).toEqual([
      "Đưa quy cách 1 lên",
      "Đưa quy cách 1 xuống",
      "Xóa quy cách 1",
    ]);
    expect(remove.parentElement!.lastElementChild).toBe(remove);
  });

  it("restores two removed pack sizes in their order, whichever Hoàn tác is tapped first", async () => {
    const events = userEvent.setup();
    render(<Harness initial={["250", "500", "1000", "2000"].map((w) => newPackagingRow(w))} />);
    await events.click(screen.getByRole("button", { name: "Xóa quy cách 2" }));
    await events.click(screen.getByRole("button", { name: "Xóa quy cách 1" }));
    expect(weights()).toEqual(["1000", "2000"]);
    const older = (await screen.findByText("Đã xóa quy cách 2 (500 g).")).closest("li")!;
    await events.click(within(older).getByRole("button", { name: "Hoàn tác" }));
    expect(weights()).toEqual(["500", "1000", "2000"]);
    const newer = (await screen.findByText("Đã xóa quy cách 1 (250 g).")).closest("li")!;
    await events.click(within(newer).getByRole("button", { name: "Hoàn tác" }));
    expect(weights()).toEqual(["250", "500", "1000", "2000"]);
  });
  it("shows under each box how the public site reads it", async () => {
    const events = userEvent.setup();
    render(<Harness initial={[newPackagingRow("2000", "150000")]} />);
    const weight = screen.getByLabelText(/^Khối lượng/);
    const price = screen.getByLabelText("Giá (VND)");
    expect(weight).toHaveAccessibleDescription("= 2 kg");
    expect(price).toHaveAccessibleDescription("= 150.000 đ");

    await events.clear(weight);
    await events.type(weight, "500");
    expect(weight).toHaveAccessibleDescription("= 500 g");
  });

  it("warns under 100 g and under 1.000 đ, without blocking the form", async () => {
    const events = userEvent.setup();
    render(<Harness initial={[newPackagingRow()]} />);
    const weight = screen.getByLabelText(/^Khối lượng/);
    const price = screen.getByLabelText("Giá (VND)");
    await events.type(weight, "2");
    await events.type(price, "150");
    expect(weight).toHaveAccessibleDescription("= 2 g Ô này tính bằng gam. Nếu là 2 kg, hãy gõ 2000.");
    expect(price).toHaveAccessibleDescription("= 150 đ Giá dưới 1.000 đ. Nếu là 150.000 đ, hãy gõ 150000.");
    expect(weight).not.toHaveAttribute("aria-invalid");

    await events.type(weight, "000");
    expect(weight).toHaveAccessibleDescription("= 2 kg");
  });

  it("reads the error first, then the reading, when a box has an error", () => {
    const row = newPackagingRow("2");
    render(
      <PackagingList
        rows={[row]}
        showPrice={false}
        onChange={() => {}}
        errors={{ [packagingErrorKey(row, "weight")]: "Khối lượng phải lớn hơn 0." }}
      />,
    );
    expect(screen.getByLabelText(/^Khối lượng/)).toHaveAccessibleDescription(
      "Khối lượng phải lớn hơn 0. = 2 g Ô này tính bằng gam. Nếu là 2 kg, hãy gõ 2000.",
    );
  });
});

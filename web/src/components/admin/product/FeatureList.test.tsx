import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { toast } from "sonner";
import { afterEach, describe, expect, it } from "vitest";
import { Toaster } from "@/components/admin/ui/sonner";
import { FeatureList, newFeatureRow, type FeatureRow } from "./FeatureList";

afterEach(() => {
  act(() => toast.dismiss());
});

function Harness({ initial }: { initial: FeatureRow[] }) {
  const [rows, setRows] = useState(initial);
  return (
    <>
      <FeatureList rows={rows} onChange={setRows} />
      <Toaster />
    </>
  );
}

const vietnamese = () => screen.queryAllByLabelText(/tiếng Việt\)$/).map((box) => (box as HTMLInputElement).value);

describe("FeatureList", () => {
  it("removes a feature at once and brings it back with Hoàn tác", async () => {
    const events = userEvent.setup();
    render(<Harness initial={[newFeatureRow("Hạt tròn", "Round"), newFeatureRow("Dẻo", "Soft")]} />);
    await events.click(screen.getByRole("button", { name: "Xóa đặc điểm 2" }));
    expect(vietnamese()).toEqual(["Hạt tròn"]);

    const message = (await screen.findByText("Đã xóa đặc điểm 2 (Dẻo).")).closest("li")!;
    await events.click(within(message).getByRole("button", { name: "Hoàn tác" }));
    expect(vietnamese()).toEqual(["Hạt tròn", "Dẻo"]);
  });

  it("keeps the delete button away from the move buttons", () => {
    render(<Harness initial={[newFeatureRow("Hạt tròn")]} />);
    expect(screen.getByRole("button", { name: "Xóa đặc điểm 1" })).toHaveClass("ml-auto");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import type { LocalizedText } from "@/lib/admin/types";
import { BilingualField } from "./BilingualField";

describe("BilingualField", () => {
  it("shows a Vietnamese and an English box inside a group with the label", () => {
    render(<BilingualField label="Tên" value={{ vi: "Gạo", en: "Rice" }} onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Tên" })).toBeInTheDocument();
    expect(screen.getByLabelText(/Tiếng Việt/)).toHaveValue("Gạo");
    expect(screen.getByLabelText(/English/)).toHaveValue("Rice");
    expect(screen.queryByText("Thiếu EN")).not.toBeInTheDocument();
  });

  it("shows the missing-EN badge when vi has text and en is empty", () => {
    render(<BilingualField label="Tên" value={{ vi: "Gạo", en: null }} onChange={() => {}} />);
    expect(screen.getByText("Thiếu EN")).toBeInTheDocument();
  });

  it("reports a change with an empty box as null", async () => {
    const onChange = vi.fn();
    render(<BilingualField label="Tên" value={{ vi: "G", en: "R" }} onChange={onChange} />);
    const events = userEvent.setup();
    await events.clear(screen.getByLabelText(/English/));
    expect(onChange).toHaveBeenLastCalledWith({ vi: "G", en: null });
    await events.type(screen.getByLabelText(/Tiếng Việt/), "a");
    expect(onChange).toHaveBeenLastCalledWith({ vi: "Ga", en: "R" });
  });

  it("uses text areas for multiline", () => {
    render(<BilingualField label="Mô tả" value={{ vi: null, en: null }} onChange={() => {}} multiline />);
    expect(screen.getByLabelText(/Tiếng Việt/).tagName).toBe("TEXTAREA");
    expect(screen.getByLabelText(/English/).tagName).toBe("TEXTAREA");
  });

  it("shows a counter and a limit when maxLength is set", () => {
    function Harness() {
      const [value, setValue] = useState<LocalizedText>({ vi: "abc", en: null });
      return <BilingualField label="Tên" value={value} onChange={setValue} maxLength={10} />;
    }
    render(<Harness />);
    expect(screen.getByText("3/10")).toBeInTheDocument();
    expect(screen.getByText("0/10")).toBeInTheDocument();
    expect(screen.getByLabelText(/Tiếng Việt/)).toHaveAttribute("maxlength", "10");
  });

  it("marks the Vietnamese box as required when viRequired", () => {
    render(<BilingualField label="Tên" value={{ vi: null, en: null }} onChange={() => {}} viRequired />);
    expect(screen.getByLabelText(/Tiếng Việt/)).toBeRequired();
    expect(screen.getByLabelText(/English/)).not.toBeRequired();
  });
});

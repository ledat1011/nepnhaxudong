import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { LocalizedText } from "@/lib/admin/types";
import { BilingualField } from "./BilingualField";
import { resetMicHintForTest } from "./MicHint";

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

  it("shows the error of a box right under that box and marks only that box as wrong", () => {
    render(
      <BilingualField
        label="Tên"
        value={{ vi: null, en: "Rice" }}
        onChange={() => {}}
        errors={{ vi: "Tên sản phẩm (tiếng Việt) không được để trống." }}
      />,
    );
    const vi = screen.getByLabelText(/Tiếng Việt/);
    expect(vi).toHaveAttribute("aria-invalid", "true");
    expect(vi).toHaveAccessibleDescription("Tên sản phẩm (tiếng Việt) không được để trống.");
    expect(screen.getByLabelText(/English/)).not.toHaveAttribute("aria-invalid");
    // The text sits in the same block as the Vietnamese box, so it shows right under it.
    expect(vi.parentElement).toHaveTextContent("Tên sản phẩm (tiếng Việt) không được để trống.");
  });
});


describe("BilingualField microphone tip", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the tip above long text boxes on a phone, and not above one-line boxes", () => {
    resetMicHintForTest();
    window.localStorage.clear();
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({ matches: query === "(pointer: coarse)", addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    const { unmount } = render(<BilingualField label="Tên" value={{ vi: null, en: null }} onChange={() => {}} />);
    expect(screen.queryByText(/micro trên bàn phím/)).not.toBeInTheDocument();
    unmount();
    render(<BilingualField label="Mô tả" multiline value={{ vi: null, en: null }} onChange={() => {}} />);
    expect(screen.getByRole("group", { name: "Mô tả" })).toHaveTextContent(/micro trên bàn phím/);
  });
});

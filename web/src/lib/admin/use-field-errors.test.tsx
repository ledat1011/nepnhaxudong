import { act, render, screen, waitFor } from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FieldError } from "@/components/admin/form/FieldError";
import { useFieldErrors } from "./use-field-errors";

let api: ReturnType<typeof useFieldErrors> | null = null;

function Form() {
  const errors = useFieldErrors();
  useEffect(() => {
    api = errors;
  });
  return (
    <div {...errors.rootProps}>
      <label htmlFor="a">Ô A</label>
      <input id="a" aria-invalid={errors.errors.a ? true : undefined} />
      <label htmlFor="b">Ô B</label>
      <input id="b" aria-invalid={errors.errors.b ? true : undefined} />
      <FieldError id="b" message={errors.errors.b} />
      <button type="button" data-error-target={errors.errors.c ? true : undefined}>
        Thêm
      </button>
    </div>
  );
}

const scrollIntoView = vi.fn();

beforeEach(() => {
  api = null;
  scrollIntoView.mockReset();
  Element.prototype.scrollIntoView = scrollIntoView;
});

afterEach(() => {
  vi.restoreAllMocks();
  // jsdom has no scrollIntoView of its own.
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

describe("useFieldErrors", () => {
  it("scrolls to the first wrong field in page order and puts the cursor in it", () => {
    render(<Form />);
    act(() => api!.show({ b: "Sai B", a: "Sai A" }));
    expect(screen.getByLabelText("Ô A")).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByLabelText("Ô A"));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });
  });

  it("can move to a control marked as the target of a group error", () => {
    render(<Form />);
    act(() => api!.show({ c: "Cần ít nhất một mục." }));
    expect(screen.getByRole("button", { name: "Thêm" })).toHaveFocus();
  });

  it("moves again when the same error is shown a second time", () => {
    render(<Form />);
    act(() => api!.show({ a: "Sai A" }));
    act(() => screen.getByLabelText("Ô B").focus());
    act(() => api!.show({ a: "Sai A" }));
    expect(screen.getByLabelText("Ô A")).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
  });

  it("does not move the cursor when the errors are cleared", () => {
    render(<Form />);
    act(() => api!.show({ a: "Sai A" }));
    act(() => screen.getByLabelText("Ô B").focus());
    act(() => api!.clear("a"));
    expect(api!.errors).toEqual({});
    expect(screen.getByLabelText("Ô B")).toHaveFocus();
    act(() => api!.show({}));
    expect(screen.getByLabelText("Ô B")).toHaveFocus();
  });
});

describe("useFieldErrors and the API", () => {
  it("does not take the cursor from a box the user types in when a slow save fails", async () => {
    const now = vi.spyOn(Date, "now").mockReturnValue(10_000);
    render(<Form />);
    act(() => api!.reset());
    act(() => screen.getByLabelText("Ô B").focus());
    now.mockReturnValue(12_000);
    act(() => api!.showApi("Ô A sai.", [{ prefix: "Ô A", field: "a" }]));
    expect(api!.errors).toEqual({ a: "Ô A sai." });
    expect(screen.getByLabelText("Ô B")).toHaveFocus();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(screen.getByLabelText("Ô B")).toHaveFocus();
  });

  it("still moves to the box when the answer comes fast", () => {
    vi.spyOn(Date, "now").mockReturnValue(10_000);
    render(<Form />);
    act(() => api!.reset());
    act(() => screen.getByLabelText("Ô B").focus());
    act(() => api!.showApi("Ô A sai.", [{ prefix: "Ô A", field: "a" }]));
    expect(screen.getByLabelText("Ô A")).toHaveFocus();
  });

  it("lists the errors that have no box on screen, so they can still be read", async () => {
    render(<Form />);
    act(() => api!.show({ b: "Sai B", hidden: "Giá phải là số nguyên không âm." }));
    await waitFor(() => expect(api!.unshown).toEqual(["Giá phải là số nguyên không âm."]));
    act(() => api!.clear("hidden"));
    expect(api!.unshown).toEqual([]);
  });
});


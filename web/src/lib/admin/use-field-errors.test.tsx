import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useFieldErrors } from "./use-field-errors";

let api: ReturnType<typeof useFieldErrors> | null = null;

function Form() {
  const errors = useFieldErrors();
  api = errors;
  return (
    <div ref={errors.root}>
      <label htmlFor="a">Ô A</label>
      <input id="a" aria-invalid={errors.errors.a ? true : undefined} />
      <label htmlFor="b">Ô B</label>
      <input id="b" aria-invalid={errors.errors.b ? true : undefined} />
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

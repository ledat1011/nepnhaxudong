import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { toast, dismiss } = vi.hoisted(() => {
  const dismiss = vi.fn();
  const toast = Object.assign(vi.fn(() => "toast-1"), { dismiss });
  return { toast, dismiss };
});
vi.mock("sonner", () => ({ toast }));

import { UNDO_MS, useRemoveWithUndo } from "./use-remove-with-undo";

type Options = { label: string; onClick(): void };
const undoOf = (call = 0) => (toast.mock.calls[call] as unknown as [string, { action: Options }])[1].action;

beforeEach(() => {
  toast.mockClear();
  dismiss.mockClear();
});

function setup(initial: string[]) {
  const onChange = vi.fn();
  const hook = renderHook(({ rows }) => useRemoveWithUndo(rows, onChange), { initialProps: { rows: initial } });
  return { onChange, ...hook };
}

describe("useRemoveWithUndo", () => {
  it("removes the row at once and offers Hoàn tác for a few seconds", () => {
    const { result, onChange } = setup(["a", "b", "c"]);
    act(() => result.current(1, "Đã xóa quy cách 2."));
    expect(onChange).toHaveBeenCalledWith(["a", "c"]);
    expect(toast).toHaveBeenCalledWith(
      "Đã xóa quy cách 2.",
      expect.objectContaining({ duration: UNDO_MS, action: expect.objectContaining({ label: "Hoàn tác" }) }),
    );
    expect(UNDO_MS).toBeGreaterThanOrEqual(8000);
  });

  it("puts the row back at its place", () => {
    const { result, onChange, rerender } = setup(["a", "b", "c"]);
    act(() => result.current(1, "Đã xóa."));
    rerender({ rows: ["a", "c"] });
    act(() => undoOf().onClick());
    expect(onChange).toHaveBeenLastCalledWith(["a", "b", "c"]);
  });

  it("keeps what the user changed after the removal", () => {
    const { result, onChange, rerender } = setup(["a", "b", "c"]);
    act(() => result.current(2, "Đã xóa."));
    rerender({ rows: ["a", "b", "d", "e"] });
    act(() => undoOf().onClick());
    expect(onChange).toHaveBeenLastCalledWith(["a", "b", "c", "d", "e"]);
  });

  it("puts the row at the end when the list became shorter", () => {
    const { result, onChange, rerender } = setup(["a", "b", "c"]);
    act(() => result.current(2, "Đã xóa."));
    rerender({ rows: [] });
    act(() => undoOf().onClick());
    expect(onChange).toHaveBeenLastCalledWith(["c"]);
  });

  it("closes its messages when the form goes away", () => {
    const { result, unmount } = setup(["a", "b"]);
    act(() => result.current(0, "Đã xóa."));
    unmount();
    expect(dismiss).toHaveBeenCalledWith("toast-1");
  });
});

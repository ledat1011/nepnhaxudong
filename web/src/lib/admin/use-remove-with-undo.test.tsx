import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { toast, dismiss } = vi.hoisted(() => {
  const dismiss = vi.fn();
  let n = 0;
  const toast = Object.assign(
    vi.fn(() => {
      n += 1;
      return `toast-${n}`;
    }),
    { dismiss },
  );
  return { toast, dismiss };
});
vi.mock("sonner", () => ({ toast }));

import { UNDO_MS, UndoGroupContext, useRemoveWithUndo, useUndoGroup, type UndoGroup } from "./use-remove-with-undo";

type Options = { label: string; onClick(): void };
type Call = [string, { action?: Options; duration?: number }];
const calls = () => toast.mock.calls as unknown as Call[];
/** The "Hoàn tác" of the n-th removal message (0-based), skipping other messages. */
const undoOf = (n = 0) => calls().filter(([, options]) => options?.action?.label === "Hoàn tác")[n][1].action!;

beforeEach(() => {
  toast.mockClear();
  dismiss.mockClear();
});

/** A list that changes like a form's state: every onChange is the next `rows`. */
function setup(initial: string[], options: { max?: number; wrapper?: (props: { children: ReactNode }) => ReactNode } = {}) {
  let rows = initial;
  const onChange = vi.fn((next: string[]) => {
    rows = next;
    hook.rerender();
  });
  const hook = renderHook(() => useRemoveWithUndo(rows, onChange, { keyOf: (row) => row, max: options.max }), {
    wrapper: options.wrapper,
  });
  return { onChange, rows: () => rows, set: (next: string[]) => ((rows = next), hook.rerender()), ...hook };
}

describe("useRemoveWithUndo", () => {
  it("removes the row at once and offers Hoàn tác for a few seconds", () => {
    const { result, rows } = setup(["a", "b", "c"]);
    act(() => result.current(1, "Đã xóa quy cách 2."));
    expect(rows()).toEqual(["a", "c"]);
    expect(toast).toHaveBeenCalledWith(
      "Đã xóa quy cách 2.",
      expect.objectContaining({ duration: UNDO_MS, action: expect.objectContaining({ label: "Hoàn tác" }) }),
    );
    expect(UNDO_MS).toBeGreaterThanOrEqual(8000);
  });

  it("puts the row back at its place", () => {
    const { result, rows } = setup(["a", "b", "c"]);
    act(() => result.current(1, "Đã xóa."));
    act(() => undoOf().onClick());
    expect(rows()).toEqual(["a", "b", "c"]);
  });

  it("keeps what the user changed after the removal", () => {
    const { result, rows, set } = setup(["a", "b", "c"]);
    act(() => result.current(2, "Đã xóa."));
    act(() => set(["a", "b", "d", "e"]));
    act(() => undoOf().onClick());
    expect(rows()).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("restores two removals in the right order, whichever is undone first", () => {
    const first = setup(["a", "b", "c", "d"]);
    act(() => first.result.current(1, "Đã xóa b."));
    act(() => first.result.current(0, "Đã xóa a."));
    expect(first.rows()).toEqual(["c", "d"]);
    act(() => undoOf(0).onClick());
    expect(first.rows()).toEqual(["b", "c", "d"]);
    act(() => undoOf(1).onClick());
    expect(first.rows()).toEqual(["a", "b", "c", "d"]);

    toast.mockClear();
    const second = setup(["a", "b", "c", "d"]);
    act(() => second.result.current(1, "Đã xóa b."));
    act(() => second.result.current(1, "Đã xóa c."));
    expect(second.rows()).toEqual(["a", "d"]);
    act(() => undoOf(0).onClick());
    expect(second.rows()).toEqual(["a", "b", "d"]);
    act(() => undoOf(1).onClick());
    expect(second.rows()).toEqual(["a", "b", "c", "d"]);
  });

  it("puts the row near its old place when both neighbours are gone", () => {
    const { result, rows, set } = setup(["a", "b", "c"]);
    act(() => result.current(1, "Đã xóa."));
    act(() => set(["x"]));
    act(() => undoOf().onClick());
    expect(rows()).toEqual(["x", "b"]);
  });

  it("does not add a row a second time when it is back in the list", () => {
    const { result, rows, set, onChange } = setup(["a", "b"]);
    act(() => result.current(0, "Đã xóa."));
    act(() => set(["b", "a"]));
    onChange.mockClear();
    act(() => undoOf().onClick());
    expect(onChange).not.toHaveBeenCalled();
    expect(rows()).toEqual(["b", "a"]);
    expect(toast).toHaveBeenLastCalledWith("Mục này đã có lại trong danh sách.");
  });

  it("does not go past the most rows the list may have", () => {
    const { result, rows, set } = setup(["a", "b"], { max: 2 });
    act(() => result.current(0, "Đã xóa."));
    act(() => set(["b", "c"]));
    act(() => undoOf().onClick());
    expect(rows()).toEqual(["b", "c"]);
    expect(toast).toHaveBeenLastCalledWith("Không hoàn tác được: danh sách đã đủ 2 mục.");
  });

  it("closes its messages when the form goes away", () => {
    const { result, unmount } = setup(["a", "b"]);
    act(() => result.current(0, "Đã xóa."));
    unmount();
    expect(dismiss).toHaveBeenCalledWith(toast.mock.results[0].value);
  });

  it("lets the form close every open message of its lists at once", () => {
    let group!: UndoGroup;
    function Form({ children }: { children: ReactNode }) {
      group = useUndoGroup();
      return <UndoGroupContext.Provider value={group}>{children}</UndoGroupContext.Provider>;
    }
    const { result } = setup(["a", "b", "c"], { wrapper: Form });
    act(() => result.current(0, "Đã xóa a."));
    act(() => result.current(0, "Đã xóa b."));
    act(() => group.dismissAll());
    expect(dismiss.mock.calls.map(([id]) => id)).toEqual(toast.mock.results.map((r) => r.value));
  });
});


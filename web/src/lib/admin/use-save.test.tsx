import { act, render, renderHook } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "./errors";

const { requireReLogin, toastSuccess } = vi.hoisted(() => ({ requireReLogin: vi.fn(), toastSuccess: vi.fn() }));

vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));
vi.mock("sonner", () => ({ toast: { success: toastSuccess } }));

import { useSave } from "./use-save";

const expired = () => new AdminApiError(401, "Phiên đã hết hạn.", "session-expired");

beforeEach(() => {
  requireReLogin.mockReset();
  toastSuccess.mockReset();
});

describe("useSave", () => {
  it("runs the action once when save is called twice before it finishes", async () => {
    let finish!: (value: string) => void;
    const action = vi.fn(() => new Promise<string>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useSave(action));

    let first!: Promise<string | undefined>;
    let second!: Promise<string | undefined>;
    act(() => {
      first = result.current.save();
      second = result.current.save();
    });
    expect(result.current.pending).toBe(true);
    await act(async () => {
      finish("ok");
      await first;
    });
    expect(await second).toBeUndefined();
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.pending).toBe(false);
  });

  it("shows a toast and returns the result on success", async () => {
    const { result } = renderHook(() => useSave(() => Promise.resolve(7)));
    let value: number | undefined;
    await act(async () => {
      value = await result.current.save();
    });
    expect(value).toBe(7);
    expect(toastSuccess).toHaveBeenCalledWith("Đã lưu.");
    expect(result.current.error).toBeNull();
  });

  it("asks for a new login on a session-expired error, then retries once", async () => {
    requireReLogin.mockResolvedValue(undefined);
    const action = vi.fn<() => Promise<string>>().mockRejectedValueOnce(expired()).mockResolvedValueOnce("saved");
    const { result } = renderHook(() => useSave(action));
    let value: string | undefined;
    await act(async () => {
      value = await result.current.save();
    });
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledTimes(2);
    expect(value).toBe("saved");
    expect(result.current.error).toBeNull();
  });

  it("shows the re-login rejection and does not retry", async () => {
    const rejection = new AdminApiError(401, "Bạn chưa đăng nhập lại.");
    requireReLogin.mockRejectedValue(rejection);
    const action = vi.fn().mockRejectedValue(expired());
    const { result } = renderHook(() => useSave(action));
    await act(async () => {
      await result.current.save();
    });
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe(rejection);
    expect(toastSuccess).not.toHaveBeenCalled();
  });

  it("does not loop when the retry is also session-expired", async () => {
    requireReLogin.mockResolvedValue(undefined);
    const action = vi.fn().mockRejectedValue(expired());
    const { result } = renderHook(() => useSave(action));
    await act(async () => {
      await result.current.save();
    });
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(action).toHaveBeenCalledTimes(2);
    expect(result.current.error?.status).toBe(401);
  });

  it("keeps other errors and clears them on the next try", async () => {
    const action = vi.fn().mockRejectedValueOnce(new AdminApiError(503, "Máy chủ bận.")).mockResolvedValueOnce(1);
    const { result } = renderHook(() => useSave(action));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.error?.detail).toBe("Máy chủ bận.");
    expect(requireReLogin).not.toHaveBeenCalled();
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.error).toBeNull();
  });

  it("can use another success message", async () => {
    const { result } = renderHook(() => useSave(() => Promise.resolve(1), { successMessage: "Đã xóa." }));
    await act(async () => {
      await result.current.save();
    });
    expect(toastSuccess).toHaveBeenCalledWith("Đã xóa.");
  });
});

describe("useSave latest action and reset", () => {
  it("runs the newest action when save is called right after a re-render", async () => {
    const first = vi.fn(() => Promise.resolve("first"));
    const second = vi.fn(() => Promise.resolve("second"));
    const { result, rerender } = renderHook(({ action }) => useSave(action), { initialProps: { action: first } });
    rerender({ action: second });
    let value: string | undefined;
    await act(async () => {
      value = await result.current.save();
    });
    expect(value).toBe("second");
    expect(first).not.toHaveBeenCalled();
  });

  it("runs the newest action when save is called from a layout effect after a re-render", async () => {
    // A layout effect of the same component runs before any plain useEffect, so only a layout-time update of `latest` is early enough.
    const values: (string | undefined)[] = [];
    const onValue = (value: string | undefined) => values.push(value);
    const first = () => Promise.resolve("first");
    const second = () => Promise.resolve("second");
    function Probe({ action }: { action: () => Promise<string> }) {
      const { save } = useSave(action);
      useLayoutEffect(() => {
        void save().then(onValue);
      }, [action, save]);
      return null;
    }
    const view = render(<Probe action={first} />);
    await act(async () => {});
    view.rerender(<Probe action={second} />);
    await act(async () => {});
    expect(values).toEqual(["first", "second"]);
  });

  it("clears the error with reset", async () => {
    const { result } = renderHook(() => useSave(() => Promise.reject(new AdminApiError(503, "Bận."))));
    await act(async () => {
      await result.current.save();
    });
    expect(result.current.error).not.toBeNull();
    act(() => result.current.reset());
    expect(result.current.error).toBeNull();
  });

  it("passes the error of a failed save to onError, after the re-login step", async () => {
    const onError = vi.fn();
    const failure = new AdminApiError(400, "Tên báo không được để trống.");
    const { result } = renderHook(() => useSave(() => Promise.reject(failure), { onError }));
    await act(async () => {
      await result.current.save();
    });
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith(failure);
    expect(result.current.error).toBe(failure);
  });
});

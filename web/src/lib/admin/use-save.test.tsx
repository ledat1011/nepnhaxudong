import { act, renderHook } from "@testing-library/react";
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

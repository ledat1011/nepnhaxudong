import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "./errors";
import type { MediaAdminDto } from "./types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({ adminFetch: vi.fn(), requireReLogin: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));

import { invalidateMediaCache, useMediaByIds } from "./use-media-by-ids";

function media(id: number): MediaAdminDto {
  return { id, url: `/media/${id}.webp`, width: 10, height: 10, mime: "image/webp", altVi: `vi ${id}`, altEn: `en ${id}` };
}

function pageOf(from: number, count: number): MediaAdminDto[] {
  return Array.from({ length: count }, (_, i) => media(from - i));
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  invalidateMediaCache();
});

describe("useMediaByIds", () => {
  it("pages through the library until every id is found, in the order of the ids", async () => {
    adminFetch.mockImplementation((path: string) =>
      Promise.resolve(path.endsWith("page=0") ? pageOf(120, 50) : path.endsWith("page=1") ? pageOf(70, 50) : pageOf(20, 20)),
    );
    const { result } = renderHook(() => useMediaByIds([25, 100]));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((m) => m.id)).toEqual([25, 100]);
    expect(adminFetch).toHaveBeenCalledTimes(2);
  });

  it("answers from the cache without a new request", async () => {
    adminFetch.mockResolvedValue(pageOf(50, 50));
    const first = renderHook(() => useMediaByIds([50]));
    await waitFor(() => expect(first.result.current.loading).toBe(false));
    adminFetch.mockClear();
    const second = renderHook(() => useMediaByIds([49, 50]));
    expect(second.result.current.loading).toBe(false);
    expect(second.result.current.items.map((m) => m.id)).toEqual([49, 50]);
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it("stops at the end of the library when an id does not exist", async () => {
    adminFetch.mockResolvedValue(pageOf(5, 5));
    const { result } = renderHook(() => useMediaByIds([5, 999]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items.map((m) => m.id)).toEqual([5]);
    expect(adminFetch).toHaveBeenCalledTimes(1);
  });

  it("does nothing for an empty list", () => {
    const { result } = renderHook(() => useMediaByIds([]));
    expect(result.current).toEqual({ items: [], loading: false });
    expect(adminFetch).not.toHaveBeenCalled();
  });

  it("opens the re-login dialog on an expired session and then loads", async () => {
    requireReLogin.mockResolvedValue(undefined);
    adminFetch
      .mockRejectedValueOnce(new AdminApiError(401, "Hết phiên.", "session-expired"))
      .mockResolvedValueOnce(pageOf(5, 5));
    const { result } = renderHook(() => useMediaByIds([5]));
    await waitFor(() => expect(result.current.items.map((m) => m.id)).toEqual([5]));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(adminFetch).toHaveBeenCalledTimes(2);
  });

  it("stops loading when the user does not sign in again", async () => {
    requireReLogin.mockRejectedValue(new AdminApiError(401, "Bạn chưa đăng nhập lại."));
    adminFetch.mockRejectedValue(new AdminApiError(401, "Hết phiên.", "session-expired"));
    const { result } = renderHook(() => useMediaByIds([5]));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.items).toEqual([]);
    expect(adminFetch).toHaveBeenCalledTimes(1);
  });

  it("refetches in a mounted consumer after invalidateMediaCache", async () => {
    adminFetch.mockResolvedValueOnce([media(5)]);
    const { result } = renderHook(() => useMediaByIds([5]));
    await waitFor(() => expect(result.current.items[0]?.altVi).toBe("vi 5"));
    adminFetch.mockResolvedValueOnce([{ ...media(5), altVi: "đã sửa" }]);
    act(() => invalidateMediaCache());
    await waitFor(() => expect(result.current.items[0]?.altVi).toBe("đã sửa"));
    expect(adminFetch).toHaveBeenCalledTimes(2);
  });
});

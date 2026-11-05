import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AdminApiError } from "./errors";
import type { MediaAdminDto } from "./types";

const { adminFetch, requireReLogin } = vi.hoisted(() => ({ adminFetch: vi.fn(), requireReLogin: vi.fn() }));
vi.mock("@/lib/admin/api", () => ({ adminFetch }));
vi.mock("@/lib/admin/session", () => ({ useAdminSession: () => ({ requireReLogin }) }));

import { invalidateMediaCache } from "./use-media-by-ids";
import { useMediaLibrary } from "./use-media-library";

function media(id: number, altVi = `vi ${id}`): MediaAdminDto {
  return { id, url: `/media/${id}.webp`, width: 10, height: 10, mime: "image/webp", altVi, altEn: `en ${id}` };
}

beforeEach(() => {
  adminFetch.mockReset();
  requireReLogin.mockReset();
  invalidateMediaCache();
});

describe("useMediaLibrary", () => {
  it("opens the re-login dialog when the session expired, then loads", async () => {
    requireReLogin.mockResolvedValue(undefined);
    adminFetch
      .mockRejectedValueOnce(new AdminApiError(401, "Hết phiên.", "session-expired"))
      .mockResolvedValueOnce([media(1)]);
    const { result } = renderHook(() => useMediaLibrary());
    await waitFor(() => expect(result.current.items).toHaveLength(1));
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBeNull();
  });

  it("shows the re-login rejection as the error", async () => {
    requireReLogin.mockRejectedValue(new AdminApiError(401, "Bạn chưa đăng nhập lại."));
    adminFetch.mockRejectedValue(new AdminApiError(401, "Hết phiên.", "session-expired"));
    const { result } = renderHook(() => useMediaLibrary());
    await waitFor(() => expect(result.current.error?.detail).toBe("Bạn chưa đăng nhập lại."));
    expect(adminFetch).toHaveBeenCalledTimes(1);
  });
});

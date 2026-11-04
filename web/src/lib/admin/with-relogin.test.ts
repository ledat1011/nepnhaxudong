import { describe, expect, it, vi } from "vitest";
import { AdminApiError } from "./errors";
import { withReLogin } from "./with-relogin";

const expired = () => new AdminApiError(401, "Phiên đã hết hạn.", "session-expired");

describe("withReLogin", () => {
  it("returns the result without asking for a login", async () => {
    const requireReLogin = vi.fn();
    expect(await withReLogin(() => Promise.resolve(5), requireReLogin)).toBe(5);
    expect(requireReLogin).not.toHaveBeenCalled();
  });

  it("asks for a login on a session-expired error, then runs once more", async () => {
    const requireReLogin = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn<() => Promise<string>>().mockRejectedValueOnce(expired()).mockResolvedValueOnce("ok");
    expect(await withReLogin(fn, requireReLogin)).toBe("ok");
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("rethrows the re-login rejection and does not run again", async () => {
    const rejection = new AdminApiError(401, "Bạn chưa đăng nhập lại.");
    const requireReLogin = vi.fn().mockRejectedValue(rejection);
    const fn = vi.fn().mockRejectedValue(expired());
    await expect(withReLogin(fn, requireReLogin)).rejects.toBe(rejection);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does not loop when the second try also expires", async () => {
    const requireReLogin = vi.fn().mockResolvedValue(undefined);
    const fn = vi.fn().mockRejectedValue(expired());
    await expect(withReLogin(fn, requireReLogin)).rejects.toMatchObject({ status: 401 });
    expect(requireReLogin).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not ask for a login on a 401 that is not session-expired", async () => {
    const requireReLogin = vi.fn();
    const failure = new AdminApiError(401, "Sai mật khẩu.", "invalid-credentials");
    await expect(withReLogin(() => Promise.reject(failure), requireReLogin)).rejects.toBe(failure);
    expect(requireReLogin).not.toHaveBeenCalled();
  });

  it("passes other errors through", async () => {
    const requireReLogin = vi.fn();
    const failure = new AdminApiError(503, "Bận.");
    await expect(withReLogin(() => Promise.reject(failure), requireReLogin)).rejects.toBe(failure);
    expect(requireReLogin).not.toHaveBeenCalled();
  });
});
